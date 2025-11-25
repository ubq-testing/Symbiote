import { Context } from "../../../types/index";
import { createRepoOctokit } from "../../octokit";
import { CallbackResult } from "../../../types/callbacks";
import { UserEvent, Notification } from "../../../types/github";
import { handleKernelForwardedEvent, handleSafeActionEvent, handleUnsafeActionEvent } from "./events/handlers";


export type RoutingSubjectKind = "event" | "notification";
export type RepositoryRoutingInput = {
  owner: string;
  repoName: string;
  repoFullName: string;
  orgName?: string | null;
  repoIsPrivateHint?: boolean | null;
  subject: {
    kind: RoutingSubjectKind;
    id?: string | number;
  };
};


/**
 * Determines the routing strategy for an event based on repository type and ubiquity app installation
 *
 * Routing strategy: 'kernel-forwarded' | 'safe-action' | 'unsafe-action'
 *
 * kernel-forwarded: The event is forwarded to the kernel (the user's kernel so it will forward it if we need it, so we could ignore it)
 * safe-action: The event is handled by the safe action  (the user's app so we can handle it)
 * unsafe-action: The event is handled by the unsafe action (the user's app cannot possibly handle it, so we auth as the user and we handle it)
 *
 */
export async function determineEventRouting(
  context: Context<"server.start" | "server.restart", "action">,
  event: UserEvent
): Promise<"kernel-forwarded" | "safe-action" | "unsafe-action"> {
  const { logger } = context;
  const { repo, org } = event;
  if (!repo) {
    logger.warn(`Event ${event.id} has no repository information, skipping`);
    throw new Error("Event has no repository information");
  }

  const [owner, repoName] = repo.name.split("/");
  if (!owner || !repoName) {
    logger.warn(`Event ${event.id} has invalid repository name: ${repo.name}`);
    throw new Error(`Invalid repository name: ${repo.name}`);
  }

  return determineRepositoryRouting(context, {
    owner,
    repoName,
    repoFullName: repo.name,
    orgName: org?.login,
    subject: {
      kind: "event",
      id: event.id,
    },
  });
}

export async function determineNotificationRouting(
  context: Context<"server.start" | "server.restart", "action">,
  notification: Notification
): Promise<"kernel-forwarded" | "safe-action" | "unsafe-action"> {
  const { logger } = context;
  const repoFullName = notification.repository?.full_name;
  if (!repoFullName) {
    logger.warn(`Notification ${notification.id ?? "unknown"} has no repository information, skipping`);
    throw new Error("Notification has no repository information");
  }

  const [owner, repoName] = repoFullName.split("/");
  if (!owner || !repoName) {
    logger.warn(`Notification ${notification.id ?? "unknown"} has invalid repository name: ${repoFullName}`);
    throw new Error(`Invalid repository name: ${repoFullName}`);
  }

  return determineRepositoryRouting(context, {
    owner,
    repoName,
    repoFullName,
    orgName: notification.repository?.owner?.login ?? null,
    repoIsPrivateHint: notification.repository?.private,
    subject: {
      kind: "notification",
      id: notification.id ?? "unknown",
    },
  });
}

async function determineRepositoryRouting(
  context: Context<"server.start" | "server.restart", "action">,
  { owner, repoName, repoFullName, orgName, repoIsPrivateHint, subject }: RepositoryRoutingInput
): Promise<"kernel-forwarded" | "safe-action" | "unsafe-action"> {
  const { logger, appOctokit, hostOctokit, env } = context;
  const subjectLabel = `${subject.kind}:${subject.id ?? "unknown"}`;

  let hasInstalledApp = false;
  let installationId: number | null = null;

  try {
    const installations = await appOctokit.rest.apps.listInstallations();
    const loginInstallation = installations.data.find((installation) => installation.account?.login?.toLowerCase() === owner.toLowerCase());
    const namedInstallation = installations.data.find((installation) => installation.account?.name?.toLowerCase() === owner.toLowerCase());

    const installation = loginInstallation || namedInstallation;

    if (installation) {
      installationId = installation.id;
    } else {
      logger.info(`[ROUTING][${subjectLabel}] No installation found for ${owner}`, {
        owner,
        repoName,
        orgName,
        subjectLabel,
      });
    }
  } catch (e) {
    logger.error(`Error listing installations`, { owner, repoName, orgName, subjectLabel });
  }

  if (installationId) {
    hasInstalledApp = true;
  }

  if (!hasInstalledApp) {
    try {
      const appAuth = await appOctokit.rest.apps.getAuthenticated();
      if (appAuth.data) {
        const { slug, name: appName, owner: appOwner } = appAuth.data;
        const appOwnerName = "login" in appOwner ? appOwner.login : (appOwner.name ?? "");
        if (appOwnerName && appOwnerName.toLowerCase() === owner.toLowerCase()) {
          logger.info(`[ROUTING][${subjectLabel}] App authentication: ${slug}`, { slug, appName, appOwnerName });
          hasInstalledApp = true;
        }
      }
    } catch (er) {
      logger.error(`Error checking app authentication`, { owner, repoName, orgName, subjectLabel });
    }
  }

  let isPrivate: boolean | null = typeof repoIsPrivateHint === "boolean" ? repoIsPrivateHint : null;

  if (isPrivate === null) {
    try {
      if (hasInstalledApp) {
        const repoOctokit = await createRepoOctokit({
          env,
          owner,
          repo: repoName,
        });
        const repoResponse = await repoOctokit.rest.repos.get({
          owner,
          repo: repoName,
        });
        isPrivate = repoResponse.data.private;
      } else {
        const repoResponse = await hostOctokit.rest.repos.get({
          owner,
          repo: repoName,
        });
        isPrivate = repoResponse.data.private;
      }
    } catch (e) {
      logger.error(`Error checking repository private status`, { owner, repoName, orgName, subjectLabel });
      isPrivate = null;
    }
  }

  logger.info(`[ROUTING][${subjectLabel}] App installation check for ${repoFullName}: ${hasInstalledApp}`);

  if (hasInstalledApp) {
    logger.info(`[ROUTING][${subjectLabel}] routing as kernel-forwarded (app installed)`);
    return "kernel-forwarded";
  } else if (isPrivate) {
    logger.info(`[ROUTING][${subjectLabel}] routing as unsafe-action (private repo)`);
    return "unsafe-action";
  } else if (isPrivate === false) {
    logger.info(`[ROUTING][${subjectLabel}] routing as safe-action (public repo)`);
    return "safe-action";
  }

  throw new Error(`[ROUTING][${subjectLabel}] could not determine repository type for ${repoFullName}`);
}

export async function handleRouting({
  routing,
  context,
  event,
}: {
  routing: "kernel-forwarded" | "safe-action" | "unsafe-action";
  context: Context<"server.start" | "server.restart", "action">;
  event: UserEvent | undefined;
}): Promise<CallbackResult> {
  if (!event) {
    context.logger.warn(`Event is undefined, skipping`);
    return { status: 500, reason: "Event is undefined, skipping", content: JSON.stringify({ event, routing }) };
  }

  switch (routing) {
    case "kernel-forwarded":
      await handleKernelForwardedEvent(context, event);
      break;
    case "safe-action":
      await handleSafeActionEvent(context, event);
      break;
    case "unsafe-action":
      await handleUnsafeActionEvent(context, event);
      break;
  }

  return {
    status: 200,
    reason: "Event processed successfully",
    content: JSON.stringify({
      event: {
        id: event.id,
        type: event.type,
        created_at: event.created_at,
        actor: event.actor?.login,
        repo: event.repo?.name,
        org: event.org?.login,
      },
      routing,
    }),
  };
}
