import { createAppAuth } from "@octokit/auth-app";
import { customOctokit } from "@ubiquity-os/plugin-sdk/octokit";
import { WorkerEnv, WorkflowEnv } from "../types/env";

export type CustomOctokit = InstanceType<typeof customOctokit>;

export async function createUserOctokit(userAccessToken: string) {
  return new customOctokit({ auth: userAccessToken });
}

export async function createAppOctokit(env: WorkerEnv | WorkflowEnv) {
  return new customOctokit({
    authStrategy: createAppAuth,
    auth: {
      appId: env.APP_ID,
      privateKey: env.APP_PRIVATE_KEY,
    },
  });
}

export async function createRepoOctokit({
    env,
    owner,
    repo,
}:{
    env: WorkerEnv | WorkflowEnv, 
    owner: string, 
    repo: string
}) {
  const appOctokit = await createAppOctokit(env);
  const installation = await appOctokit.rest.apps.getRepoInstallation({ owner, repo });
  return new customOctokit({
    authStrategy: createAppAuth,
    auth: {
      appId: Number(env.APP_ID),
      privateKey: env.APP_PRIVATE_KEY,
      installationId: installation.data.id,
    },
  });
}
