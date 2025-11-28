import { StaticDecode, Type as T } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";

const NODE_ENV = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  LOCAL: "local",
} as const;

const openRouterApiKeySchema = T.String({ minLength: 1 });
const openAiApiKeySchema = T.String({ minLength: 1 });
const AI_API_KEY = T.Union([openRouterApiKeySchema, openAiApiKeySchema], { default: openRouterApiKeySchema });

const symbioteHostSchema = T.Object({
  HOST_PAT: T.String({
    minLength: 1,
    description: "A GitHub personal access token belonging to the SYMBIOTE_HOST_USERNAME.",
  }),
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

const SYMBIOTE_HOST = T.Transform(T.Union([symbioteHostSchema, T.String()]))
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
  });

const oauthSchema = T.Object({
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
  TOKEN_ENCRYPTION_KEY: T.String({
    minLength: 44, // Base64-encoded 32-byte key is 44 characters
    description: "Base64-encoded 32-byte key for encrypting OAuth tokens at rest. " + "Generate with: openssl rand -base64 32",
  }),
});

const OAUTH = T.Transform(T.Union([T.String(), oauthSchema]))
  .Decode((value) => {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Value.Decode(oauthSchema, Value.Default(oauthSchema, parsed));
      } catch (error) {
        throw new Error("Invalid OAUTH");
      }
    }
    return value;
  })
  .Encode((value) => JSON.stringify(value));

const workerSchema = T.Object({
  URL: T.String({
    minLength: 1,
    description: "The URL of the Symbiote worker to use for the plugin.",
  }),
  SECRET: T.String({
    minLength: 1,
    description: "A shared secret between the worker and the action.",
  }),
});

const WORKER = T.Transform(T.Union([T.String(), workerSchema]))
  .Decode((value) => {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Value.Decode(workerSchema, Value.Default(workerSchema, parsed));
      } catch (error) {
        throw new Error("Invalid WORKER");
      }
    }
    return value;
  })
  .Encode((value) => JSON.stringify(value));

const telegramSchema = T.Object({
  BOT_TOKEN: T.String({
    minLength: 1,
    description: "Telegram Bot API token from @BotFather",
  }),
  HOST_USERNAME: T.String({
    minLength: 1,
    description: "The username of the host user",
  }),
  WEBHOOK_SECRET: T.Optional(
    T.String({
      minLength: 1,
      description: "Optional secret for webhook validation",
    })
  ),
  WEBHOOK_URL: T.String({
    minLength: 1,
    description: "Optional webhook URL for the Telegram bot",
    examples: ["https://smee.io/xyz123", "https://your-worker.workers.dev/telegram", "https://your-deno.dev/telegram"],
  }),
});

const TELEGRAM = T.Transform(T.Union([telegramSchema, T.String()]))
  .Decode((value) => {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Value.Decode(telegramSchema, Value.Default(telegramSchema, parsed));
      } catch {
        throw new Error("Invalid TELEGRAM config");
      }
    }
    return value;
  })
  .Encode((value) => JSON.stringify(value));

const sharedSchema = T.Object({
  APP_ID: T.String({ minLength: 1 }),
  APP_PRIVATE_KEY: T.String({ minLength: 1 }),
  KERNEL_PUBLIC_KEY: T.Optional(T.String()),
  AI_API_KEY: AI_API_KEY,
  OAUTH: OAUTH,
  WORKER: WORKER,
  SYMBIOTE_HOST: SYMBIOTE_HOST,
  DENO_KV_UUID: T.String({
    minLength: 1,
    description: "The UUID of the DENO_KV_URL.",
  }),
  DENO_KV_ACCESS_TOKEN: T.String({
    minLength: 1,
    description: "The access token of the DENO_KV_URL.",
  }),
  LOG_LEVEL: T.Optional(T.Enum(LOG_LEVEL, { default: LOG_LEVEL.INFO })),
  NODE_ENV: T.Optional(T.Enum(NODE_ENV, { default: NODE_ENV.DEVELOPMENT })),
  TELEGRAM: T.Optional(TELEGRAM),
});

export const workerEnvSchema = sharedSchema;
export const workflowEnvSchema = T.Composite([
  sharedSchema,
  T.Object({
    PLUGIN_GITHUB_TOKEN: T.String({
      minLength: 1,
      description: "Required by the SDK or it'll throw and only used to return data to the kernel, which is not used in this plugin.",
      default: "N/A" as const,
    }),
    GITHUB_RUN_ID: T.String({
      minLength: 1,
      description: "The ID of the GitHub workflow run.",
    }),
  }),
]);

export type WorkerEnv = StaticDecode<typeof workerEnvSchema>;
export type WorkflowEnv = StaticDecode<typeof workflowEnvSchema>;
