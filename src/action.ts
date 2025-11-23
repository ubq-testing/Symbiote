import { Context, createActionsPlugin } from "@ubiquity-os/plugin-sdk";
import { LOG_LEVEL, LogLevel } from "@ubiquity-os/ubiquity-os-logger";
import { runSymbiote } from "./index";
import { pluginSettingsSchema, PluginSettings, SupportedEvents, Command, SupportedCustomEvents, SupportedWebhookEvents } from "./types";
import { WorkflowEnv, workflowEnvSchema } from "./types/env";
import { validateEnvironment } from "./utils/validate-env";
import { env as honoEnv } from "hono/adapter";


async function runAction() {
    const validatedEnv = validateEnvironment(
        honoEnv(process.env as unknown as Parameters<typeof honoEnv>[0]),
        "action"
    ) as WorkflowEnv;
    process.env = validatedEnv as unknown as Record<string, string>;

    console.log("Validated environment:", validatedEnv);
    console.log("Process environment:", process.env);
    return await createActionsPlugin<
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
        })
}

runAction().catch(console.error);