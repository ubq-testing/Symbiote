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
    eventsPerPage: T.Number({
      description: "Number of events to fetch per API request (max 100).",
      default: 30,
      minimum: 1,
      maximum: 100,
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
  },
  { default: {} }
);

export type PluginSettings = StaticDecode<typeof pluginSettingsSchema>;
