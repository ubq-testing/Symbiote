import { createActionsPlugin } from "@ubiquity-os/plugin-sdk";
import { LOG_LEVEL, LogLevel } from "@ubiquity-os/ubiquity-os-logger";
import { runSymbiote } from "./index";
import { pluginSettingsSchema, PluginSettings, SupportedEvents, SupportedCustomEvents, SupportedWebhookEvents } from "./types/index";
import { WorkflowEnv, workflowEnvSchema } from "./types/env";
import { validateEnvironment } from "./utils/env";
import { Command } from "./types/command";
import { createAdapters } from "./adapters/create-adapters";
import { createAppOctokit, createUserOctokit } from "./handlers/octokit";

async function runAction() {
    process.env = validateEnvironment(process.env as Record<string, string>, "action") as unknown as Record<string, string>;
    const pluginInputs = (await import("@actions/github")).context.payload.inputs;
    const authToken = pluginInputs?.authToken;
    if (!authToken) {
        console.error("Auth token not found", pluginInputs);
        throw new Error("Auth token not found");
    }

    try {
        await createActionsPlugin<
            PluginSettings,
            WorkflowEnv,
            Command,
            SupportedWebhookEvents & SupportedCustomEvents
        >(
            async(context) => {
                const adapters = await createAdapters(context.env, context.config);
                return runSymbiote<SupportedEvents, "action">({
                    ...context,
                    appOctokit: await createAppOctokit(context.env),
                    hostOctokit: await createUserOctokit(authToken),
                    runtime: "action",
                    adapters,
                })
            },
            {
                envSchema: workflowEnvSchema,
                postCommentOnError: true,
                settingsSchema: pluginSettingsSchema,
                logLevel: (process.env.LOG_LEVEL as LogLevel) ?? LOG_LEVEL.INFO,
                kernelPublicKey: process.env.KERNEL_PUBLIC_KEY as string,
                bypassSignatureVerification: true
            } as unknown as Parameters<
                typeof createActionsPlugin<
                    PluginSettings,
                    WorkflowEnv,
                    Command,
                    SupportedWebhookEvents & SupportedCustomEvents
                >
            >[1])

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