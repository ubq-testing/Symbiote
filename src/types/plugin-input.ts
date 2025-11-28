import { StaticDecode, Type as T } from "@sinclair/typebox";

/**
 * Plugin settings for Symbiote automation agent.
 */
export const pluginSettingsSchema = T.Object(
  {
    executionBranch: T.String({
      minLength: 1,
      description: "The branch to use for the Symbiote workflow.",
      default: "development" as const,
    }),
    // Event polling configuration
    pollIntervalSeconds: T.Number({
      description: "Interval in seconds between polling for user events.",
      default: 60,
      minimum: 10,
      maximum: 3600,
    }),
    // Runtime management configuration
    maxRuntimeHours: T.Number({
      description: "Maximum runtime in hours before automatic restart (We always keep a safety buffer of 1 hour; so 6 = 5 hours max runtime).",
      default: 6,
      minimum: 2,
      maximum: 6,
    }),
    runtimeCheckIntervalMinutes: T.Number({
      description: "This is the interval at which the server will check if it should restart.",
      default: 60,
      minimum: 1,
      maximum: 360,
    }),
    // TODO: roll this out
    orgsToWorkIn: T.Array(T.String({
      examples: ["ubiquity-os", "ubq-testing"],
      description: `Those listed here instantly approve the bot to work within that organization without additional investigation.
      Any not listed here that appear in the host's events/notifications will be investigated by the symbiont to determine 
      if it can work in that organization and repository with the permissions available to it.`.trim() 
    })),
    aiConfig: T.Object(
      {
        kind: T.Union([
          T.Literal("OpenAi", { description: "Use OpenAI's public API." }),
          T.Literal("OpenRouter", { description: "Use OpenRouter as a proxy/provider." }),
        ]),
        model: T.String({
          description: "Chat/completions model identifier.",
          default: "x-ai/grok-4.1-fast",
          examples: ["gpt-4o-mini", "o1-mini", "openai/gpt-4o-mini"],
        }),
        baseUrl: T.String({
          description: "Base URL for the LLM endpoint.",
          default: "https://openrouter.ai/api/v1",

        }),
      },
      {
        default: {
          kind: "OpenAi",
          model: "x-ai/grok-4.1-fast",
          baseUrl: "https://openrouter.ai/api/v1",
        },
      }
    ),
  },
  { default: {} }
);

export type PluginSettings = StaticDecode<typeof pluginSettingsSchema>;
