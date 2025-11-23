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
    // deploySymbiont: T.Boolean({
    //   description: "If false, the Symbiote server (see .github/workflows/symbiote-server.yml) will not be deployed. What this means is that the plugin will not attempt to poll for user events and will only be able to handle kernel-forward requests (app install-scoped events)",
    //   default: true as const,
    // }),
  },
  { default: {} }
);

export type PluginSettings = StaticDecode<typeof pluginSettingsSchema>;
