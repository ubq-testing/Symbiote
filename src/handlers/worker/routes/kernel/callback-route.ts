import { createPlugin } from "@ubiquity-os/plugin-sdk";
import { PluginSettings, pluginSettingsSchema, SupportedCustomEvents, SupportedEvents, SupportedWebhookEvents, WorkerEnv, workerEnvSchema } from "../../../../types/index";
import { Manifest } from "@ubiquity-os/plugin-sdk/manifest";
import { LogLevel, LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";
import { runSymbiote } from "../../../../index";
import { createAdapters } from "../../../../adapters/create-adapters";
import { PluginInputs } from "../../../../types/callbacks";
import { Command } from "../../../../types/command";
import { createAppOctokit, createUserOctokit } from "../../../octokit";
import manifest from "../../../../../manifest.json" with { type: "json" };

export async function createKernelCallbackRoute({
    validatedEnv,
    clonedRequest,
    env,
  }: {
    validatedEnv: WorkerEnv;
    clonedRequest: Request;
    env: WorkerEnv;
  }) {
    return createPlugin<PluginSettings, WorkerEnv, Command, SupportedWebhookEvents & SupportedCustomEvents>(
      async (context) => {
        const adapters = await createAdapters(validatedEnv, context.config);
        const pluginInputs = (await clonedRequest.json()) as PluginInputs;
        
        // appOctokit: Authorized as the GitHub App for app-level operations (installations, etc.)
        const appOctokit = context.octokit;
        // hostOctokit: Authorized with host PAT for polling events/notifications
        const hostOctokit = await createUserOctokit(pluginInputs.authToken);
        // symbioteOctokit: For kernel-forwarded events, use the context.octokit (installation token)
        // since the kernel handles auth. For public-facing actions, this will be the installation token.
        const symbioteOctokit = await createUserOctokit(pluginInputs.authToken);
        
        return runSymbiote<SupportedEvents, "worker">({
          ...context,
          appOctokit,
          hostOctokit,
          symbioteOctokit,
          env: validatedEnv,
          request: clonedRequest,
          pluginInputs,
          runtime: "worker",
          adapters,
        });
      },
      manifest as Manifest,
      {
        envSchema: workerEnvSchema,
        postCommentOnError: true,
        settingsSchema: pluginSettingsSchema,
        logLevel: (env.LOG_LEVEL as LogLevel) ?? LOG_LEVEL.INFO,
        kernelPublicKey: env.KERNEL_PUBLIC_KEY as string,
        bypassSignatureVerification: true,
      } as unknown as Parameters<typeof createPlugin<PluginSettings, WorkerEnv, Command, SupportedWebhookEvents & SupportedCustomEvents>>[2]
    );
  }