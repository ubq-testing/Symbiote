import { createActionsPlugin } from "@ubiquity-os/plugin-sdk";
import { LOG_LEVEL, LogLevel } from "@ubiquity-os/ubiquity-os-logger";
import { runSymbiote } from "./index";
import { pluginSettingsSchema, PluginSettings, SupportedEvents, Command, SupportedCustomEvents, SupportedWebhookEvents } from "./types";
import { WorkflowEnv, workflowEnvSchema } from "./types/env";

createActionsPlugin<
    PluginSettings,
    WorkflowEnv, 
    Command, 
    SupportedWebhookEvents & SupportedCustomEvents
    >(
    (context) => {
        return runSymbiote<SupportedEvents, "action">(context)
    },
    {
        envSchema: workflowEnvSchema,
        postCommentOnError: true,
        settingsSchema: pluginSettingsSchema,
        logLevel: (process.env.LOG_LEVEL as LogLevel) ?? LOG_LEVEL.INFO,
        kernelPublicKey: process.env.KERNEL_PUBLIC_KEY as string,
        bypassSignatureVerification: true
    }).catch(console.error);