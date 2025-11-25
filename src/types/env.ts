import { StaticDecode, Type as T } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";

const symbioteHostSchema = T.Object({
  USERNAME: T.String({
    minLength: 1,
    examples: ["keyrxng", "GithubUserName"],
    description: "The GitHub login of the host user (user.login not user.name).",
    pattern: "^[a-zA-Z0-9_-]+$",
  }),
  FORKED_REPO: T.Transform(
    T.Union([
      T.String(),
      T.Object({
        owner: T.String({
          minLength: 1,
          examples: ["keyrxng"],
          description: "The owner of the repository where the host forked the Symbiote repository to host the bot",
          pattern: "^[a-zA-Z0-9_-]+$",
        }),
        repo: T.String({
          minLength: 1,
          examples: ["Symbiote"],
          description: "The name of the repository where the host forked the Symbiote repository to host the bot",
          pattern: "^[a-zA-Z0-9_-]+$",
        }),
      }),
    ])
  )
    .Decode((value) => {
      if (typeof value === "string") {
        const [owner, repo] = value.split("/");
        if (!owner || !repo) {
          throw new Error("Undefined SYMBIOTE_HOST.FORKED_REPO");
        }
        return { owner, repo };
      }
      return value;
    })
    .Encode((value) => {
      if (!value.owner || !value.repo) {
        throw new Error("Invalid SYMBIOTE_HOST.FORKED_REPO");
      }
      return `${value.owner}/${value.repo}`;
    }),
});

const NODE_ENV = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  LOCAL: "local",
} as const;

const openRouterApiKeySchema = T.String({ minLength: 1 });
const openAiApiKeySchema = T.String({ minLength: 1 });

const sharedSchema = T.Object({
  SYMBIOTE_HOST: T.Transform(T.Union([symbioteHostSchema, T.String()]))
    .Decode((value) => {
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value) as StaticDecode<typeof symbioteHostSchema>;
          if (!Value.Check(symbioteHostSchema, parsed)) {
            throw new Error("Invalid SYMBIOTE_HOST");
          }
          return Value.Decode(symbioteHostSchema, Value.Default(symbioteHostSchema, parsed));
        } catch (error) {
          throw new Error("Invalid SYMBIOTE_HOST");
        }
      }
      return value;
    })
    .Encode((value) => {
      return JSON.stringify(value);
    }),
  APP_ID: T.String({ minLength: 1 }),
  APP_PRIVATE_KEY: T.String({ minLength: 1 }),
  OAUTH: T.Transform(
    T.Union([
      T.String(),
      T.Object({
        CLIENT_ID: T.String({
          minLength: 1,
          description: "OAuth client ID used when building the authorization URL.",
        }),
        CLIENT_SECRET: T.String({
          minLength: 1,
          description: "OAuth client secret used to exchange the authorization code.",
        }),
        REDIRECT_URI: T.String({
          minLength: 1,
          description: "OAuth redirect URI that receives GitHub's callback.",
        }),
      }),
    ])
  )
    .Decode((value) => {
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          if(!parsed.CLIENT_ID || !parsed.CLIENT_SECRET || !parsed.REDIRECT_URI) {
            throw new Error("Invalid OAUTH");
          }
          return parsed;
        } catch (error) {
          throw new Error("Invalid OAUTH");
        }
      }
      return value;
    })
    .Encode((value) => JSON.stringify(value)),
  KERNEL_PUBLIC_KEY: T.Optional(T.String()),
  LOG_LEVEL: T.Optional(T.Enum(LOG_LEVEL, { default: LOG_LEVEL.INFO })),
  WORKER_SECRET: T.String({
    minLength: 1,
    description: "A shared secret between the worker and the action.",
  }),
  NODE_ENV: T.Optional(T.Enum(NODE_ENV, { default: NODE_ENV.DEVELOPMENT })),
  AI_API_KEY: T.Union([openRouterApiKeySchema, openAiApiKeySchema], { default: openAiApiKeySchema }),
});

export const workerEnvSchema = sharedSchema;
export type WorkerEnv = StaticDecode<typeof workerEnvSchema>;

export const workflowEnvSchema = T.Composite([
  sharedSchema,
  T.Object({
    SYMBIOTE_HOST_PAT: T.String({
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
      description: "The URL of the Symbiote worker to use for the plugin.",
    }),
    GITHUB_RUN_ID: T.String({
      minLength: 1,
      description: "The ID of the GitHub workflow run.",
    }),
    DENO_KV_UUID: T.String({
      minLength: 1,
      description: "The UUID of the DENO_KV_URL.",
    }),
    DENO_KV_ACCESS_TOKEN: T.String({
      minLength: 1,
      description: "The access token of the DENO_KV_URL.",
    }),
  }),
]);
export type WorkflowEnv = StaticDecode<typeof workflowEnvSchema>;
