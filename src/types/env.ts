import { StaticDecode, Type as T } from "@sinclair/typebox";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";

const symbioteHostSchema = T.Object({
  USERNAME: T.String({
    minLength: 1,
    examples: ["keyrxng", "GithubUserName"],
    description: "The GitHub login of the host user (user.login not user.name).",
    pattern: "^[a-zA-Z0-9_-]+$",
  }),
  FORKED_REPO: T.Transform(T.String({
    minLength: 1,
    examples: ["keyrxng/Symbiote"],
    description: "The name of the repository where the host forked the Symbiote repository to host the bot",
    pattern: "^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+$",
  })).Decode((value) => {
    const [owner, repo] = value.split("/");
    return { owner, repo };
  }).Encode((value) => `${value.owner}/${value.repo}`),
});

const sharedSchema = T.Object({
  SYMBIOTE_HOST: symbioteHostSchema,
  APP_ID: T.String({ minLength: 1 }),
  APP_PRIVATE_KEY: T.String({ minLength: 1 }),
  KERNEL_PUBLIC_KEY: T.Optional(T.String()),
  LOG_LEVEL: T.Optional(T.Enum(LOG_LEVEL, { default: LOG_LEVEL.INFO })),
  WORKER_SECRET: T.String({
    minLength: 1,
    description: "A shared secret between the worker and the action."
  }),
});

export const workerEnvSchema = T.Intersect([sharedSchema, T.Object({
  // maybe
})]);
export type WorkerEnv = StaticDecode<typeof workerEnvSchema>;

export const workflowEnvSchema = T.Intersect([sharedSchema, T.Object({
  GITHUB_PAT: T.String({
    minLength: 1,
    description: "A GitHub personal access token belonging to the SYMBIOTE_HOST_USERNAME.",
  }),
  PLUGIN_GITHUB_TOKEN: T.String({
    minLength: 1,
    description: "Required by the SDK or it'll throw and only used to return data to the kernel, which is not used in this plugin.",
    default: "N/A" as const,
  }),
  WORKER_URL: T.String({
    minLength: 1,
    description: "The URL of the Symbiote worker to use for the plugin."
  }),
})]);
export type WorkflowEnv = StaticDecode<typeof workflowEnvSchema>;
