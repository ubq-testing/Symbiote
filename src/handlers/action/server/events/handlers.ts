import { Context } from "../../../../types/index";
import { UserEvent } from "../../../../types/github";
import { dispatchEvent } from "./dispatcher";

/**
 * Handles kernel-forwarded events (repos with ubiquity app installed)
 * Routes through AI pipeline for classification and potential action
 */
export async function handleKernelForwardedEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  await dispatchEvent({
    context,
    event,
    route: "kernel-forwarded",
  });
}

/**
 * Handles safe action events (public repos without ubiquity app)
 * Routes through AI pipeline for classification and potential action
 */
export async function handleSafeActionEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  await dispatchEvent({
    context,
    event,
    route: "safe-action",
  });
}

/**
 * Handles unsafe action events (private repos or sensitive actions)
 * Routes through AI pipeline for classification and potential action
 */
export async function handleUnsafeActionEvent(context: Context<"server.start" | "server.restart", "action">, event: UserEvent): Promise<void> {
  await dispatchEvent({
    context,
    event,
    route: "unsafe-action",
  });
}
