import { createActionsPlugin } from "@ubiquity-os/plugin-sdk";
import { LOG_LEVEL, LogLevel } from "@ubiquity-os/ubiquity-os-logger";
import { runSymbiote } from "./index.ts";
import { pluginSettingsSchema, PluginSettings, SupportedEvents, SupportedCustomEvents, SupportedWebhookEvents } from "./types/index";
import { WorkflowEnv, workflowEnvSchema } from "./types/env";
import { validateEnvironment } from "./utils/validate-env";
import { Command } from "./types/command.ts";

async function runAction() {
    process.env = validateEnvironment(process.env as Record<string, string>, "action") as unknown as Record<string, string>;

    try {
        await createActionsPlugin<
            PluginSettings,
            WorkflowEnv,
            Command,
            SupportedWebhookEvents & SupportedCustomEvents
        >(
            (context) => {
                return runSymbiote<SupportedEvents, "action">({
                    ...context,
                    runtime: "action",
                })
            },
            {
                envSchema: workflowEnvSchema,
                postCommentOnError: true,
                settingsSchema: pluginSettingsSchema,
                logLevel: (process.env.LOG_LEVEL as LogLevel) ?? LOG_LEVEL.INFO,
                kernelPublicKey: process.env.KERNEL_PUBLIC_KEY as string,
                bypassSignatureVerification: true
            })

        process.exit(0);
    } catch (error) {
        console.trace(error);
        console.error("Error creating actions plugin:", error);
        process.exit(1);
    }
}

runAction().catch((error) => {
    console.trace(error);
    process.exit(1);
});