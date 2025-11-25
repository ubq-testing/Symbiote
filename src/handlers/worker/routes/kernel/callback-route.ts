import { createPlugin } from "@ubiquity-os/plugin-sdk";
import { PluginSettings, pluginSettingsSchema, SupportedCustomEvents, SupportedEvents, SupportedWebhookEvents, WorkerEnv, workerEnvSchema } from "../../../../types/index";
import { Manifest } from "@ubiquity-os/plugin-sdk/manifest";
import { LogLevel, LOG_LEVEL } from "@ubiquity-os/ubiquity-os-logger";
import { runSymbiote } from "../../../../index";
import { createAdapters } from "../../../../adapters/create-adapters";
import { PluginInputs } from "../../../../types/callbacks";
import { Command } from "../../../../types/command";
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
        return runSymbiote<SupportedEvents, "worker">({
          ...context,
          // TODO: Worker should only have octokit as standard
          appOctokit: context.octokit,
          hostOctokit: context.octokit,
          env: validatedEnv,
          request: clonedRequest,
          pluginInputs: (await clonedRequest.json()) as PluginInputs,
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