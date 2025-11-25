// import { CallbackResult } from "../../../types/callbacks";
// import { Context } from "../../../types/index";
// import { handleSymbioteServer } from "../symbiote-server";
// import {
//   buildAuthorizationUrl,
//   generateOAuthState,
//   postAuthorizationComment,
//   readUserToken,
//   storePendingState,
// } from "../routes/oauth/backend";



// // export async function handleServerStartWorker(context: Context<"server.start", "worker">): Promise<CallbackResult> {
// //   const { logger, payload } = context;
// //   const { sessionId, workflowId } = payload.client_payload;
// //   logger.info(`Handling server.start event in worker`, { sessionId, workflowId });
// //   return await handleSymbioteServer(context, "start");
// // }


// // export async function handleServerStartWorker(context: Context<"server.start", "worker">): Promise<CallbackResult> {
// //   const { logger, payload, adapters, env, appOctokit } = context;
// //   const { sessionId, workflowId } = payload.client_payload;
// //   logger.info(`Handling server.start event in worker`, { sessionId, workflowId });

// //   const login = payload.client_payload.authToken.split(":")[0];
// //   if (!login) {
// //     logger.error("Unable to determine user login for OAuth flow");
// //     return { status: 500, reason: "Missing login information for OAuth flow" };
// //   }

// //   const cachedToken = await readUserToken(adapters.kv, login);

// //   if (!cachedToken) {
// //     const repository = payload.repository;
// //     const owner = repository?.owner?.login;
// //     const repo = repository?.name;
// //     const issueNumber = payload.issue?.number ?? payload.pull_request?.number;

// //     if (!owner || !repo || !issueNumber) {
// //       logger.error("Missing repository or issue context when requesting OAuth authorization");
// //       return { status: 500, reason: "Unable to build OAuth authorization comment" };
// //     }

// //     const state = generateOAuthState();
// //     await storePendingState(adapters.kv, state, {
// //       login,
// //       owner,
// //       repo,
// //       issueNumber,
// //       createdAt: new Date().toISOString(),
// //     });

// //     const authUrl = buildAuthorizationUrl(env, state);
// //     await postAuthorizationComment({
// //       appOctokit,
// //       owner,
// //       repo,
// //       issueNumber,
// //       login,
// //       url: authUrl,
// //     });

// //     logger.info("OAuth authorization requested", { login, owner, repo, issueNumber, state });
// //     return { status: 200, reason: "OAuth authorization requested. Please follow the comment link." };
// //   }

// //   context.pluginInputs.authToken = cachedToken;
// //   logger.info("Using cached OAuth token for user", { login });

// //   return await handleSymbioteServer(context, "start");
// // }
