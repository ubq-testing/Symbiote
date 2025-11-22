import {  createPlugin } from "@ubiquity-os/plugin-sdk";
import { Manifest } from "@ubiquity-os/plugin-sdk/manifest";
import { LOG_LEVEL, LogLevel } from "@ubiquity-os/ubiquity-os-logger";
import { ExecutionContext } from "hono";
import manifest from "../manifest.json" with { type: "json" };
import { runSymbiote } from "./index";
import { workerEnvSchema, pluginSettingsSchema, PluginSettings, SupportedEvents, Command } from "./types";
import { WorkerEnv } from "./types/env";  


export default {
  async fetch(request: Request, env: WorkerEnv, executionCtx?: ExecutionContext) {
    const honoApp = createPlugin<PluginSettings, WorkerEnv, Command, SupportedEvents>(
      (context) => {
        return runSymbiote<SupportedEvents, "worker">({
          ...context,
          request: request.clone(),
        });
      },
      manifest as Manifest,
      {
        envSchema: workerEnvSchema,
        postCommentOnError: true,
        settingsSchema: pluginSettingsSchema,
        logLevel: (env.LOG_LEVEL as LogLevel) ?? LOG_LEVEL.INFO,
        kernelPublicKey: env.KERNEL_PUBLIC_KEY as string,
        bypassSignatureVerification: true
      }
    );

    return honoApp.fetch(request, env, executionCtx);
  },
};
