import { Context } from "../../../../types/index";
import type { UserEvent } from "../../../../types/github";
import { EventAssessmentRequest } from "../../../../adapters/ai/prompts/types";
import { createRepoOctokit } from "../../../octokit";
import { getWorkspaceRegistry, resolveEventSubject } from "../../../../adapters/ai/context-resolver";

/**
 * Dispatches an event through the AI pipeline for classification and potential action
 */
export async function dispatchEvent({
  context,
  event,
  route,
}: {
  context: Context<"server.start" | "server.restart", "action">;
  event: UserEvent;
  route: "kernel-forwarded" | "safe-action" | "unsafe-action";
}): Promise<void> {
  const { logger, adapters, env, config } = context;
  const eventId = event.id ?? "unknown";
  const repoFullName = event.repo?.name ?? null;
  const actorLogin = event.actor?.login ?? null;
  const hostUsername = env.SYMBIOTE_HOST.USERNAME;

  logger.info(`[EVENTS] Processing event ${eventId}`, {
    route,
    type: event.type,
    actor: actorLogin,
    repo: repoFullName,
    createdAt: event.created_at,
  });

  if (!adapters.ai) {
    logger.warn(`[EVENTS] AI adapter not configured; skipping event ${eventId}`);
    return;
  }

  // Determine which octokit to use for reading context
  let octokit;
  const [owner, repo] = repoFullName?.split("/") ?? [];

  if ((route === "kernel-forwarded" || route === "safe-action") && owner && repo) {
    // maybe todo, identify if an install auth'd instance is required or if we can use the symbioteOctokit
    // want to avoid permissions/access issues
    octokit = await createRepoOctokit({
      env: context.env,
      owner,
      repo,
    });
  } else {
    octokit = context.hostOctokit;
  }

  // Pre-fetch workspace registry and resolve subject context
  const workspaceRegistry = await getWorkspaceRegistry({
    octokit: context.hostOctokit,
    hostUsername,
    orgsToWorkIn: config.orgsToWorkIn ?? [],
    kv: adapters.kv,
  });

  const resolvedSubject = await resolveEventSubject({
    octokit,
    event,
    hostUsername,
    registry: workspaceRegistry,
  });

  logger.info(`[EVENTS] Context resolved for ${eventId}`, {
    forkMapSize: Object.keys(workspaceRegistry.fork_map).length,
    resolvedSubject: resolvedSubject ? {
      type: resolvedSubject.type,
      number: resolvedSubject.number,
      host_fork_for_base: resolvedSubject.host_fork_for_base,
    } : null,
  });

  const request: EventAssessmentRequest = {
    kind: "event",
    hostUsername,
    event,
    octokit,
    workspaceRegistry,
    resolvedSubject: resolvedSubject ?? undefined,
  };

  const { assessment, messages } = await adapters.ai.classify(request);

  logger.info(`[EVENTS] AI assessment completed for ${eventId}`, {
    assessment,
    eventType: event.type,
    actor: actorLogin,
  });

  if (assessment.classification === "respond" && assessment.shouldAct) {
    logger.info(`[EVENTS] AI chose to act on event ${eventId}`, {
      suggestedActions: assessment.suggestedActions,
      confidence: assessment.confidence,
    });

    // Use symbioteOctokit for public-facing actions (comments, PRs, issues)
    const { messages: actionMessages, response } = await adapters.ai.executeSuggestedActions({
      request,
      octokit: context.symbioteOctokit,
      assessment,
      existingMessages: [...messages],
    });

    logger.info(`[EVENTS] AI action result for ${eventId}`, {
      results: response.results,
      finalResponse: response.finalResponse,
      messages: actionMessages,
    });
  } else {
    logger.info(`[EVENTS] AI chose to ${assessment.classification} event ${eventId}`, {
      assessment,
      eventType: event.type,
    });
  }
}

