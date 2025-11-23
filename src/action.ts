import { Context, createActionsPlugin } from "@ubiquity-os/plugin-sdk";
import { LOG_LEVEL, LogLevel } from "@ubiquity-os/ubiquity-os-logger";
import { runSymbiote } from "./index";
import { pluginSettingsSchema, PluginSettings, SupportedEvents, Command, SupportedCustomEvents, SupportedWebhookEvents } from "./types";
import { WorkflowEnv, workflowEnvSchema } from "./types/env";
import { validateEnvironment } from "./utils/validate-env";

async function runAction() {
    const validatedEnv = validateEnvironment(process.env as Record<string, string>, "action") as WorkflowEnv;
    process.env = validatedEnv as unknown as Record<string, string>;
    console.log("Validated environment (process.env):", process.env);

    try {
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