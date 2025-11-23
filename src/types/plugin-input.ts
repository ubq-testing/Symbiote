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
    test: T.String({
      minLength: 1,
      description: "A test string.",
      default: "test" as const,
    }),
  },
  { default: {} }
);

export type PluginSettings = StaticDecode<typeof pluginSettingsSchema>;
