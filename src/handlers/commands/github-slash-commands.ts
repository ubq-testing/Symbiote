import { Context } from "../../types/index";
import { handleSymbioteServer } from "../worker/symbiote-server";

export async function handleCommand(context: Context<"issue_comment.created", "worker">) {
    const { payload: { comment }, logger } = context;

    if (!comment.body.startsWith("/symbiote")) {
        return { status: 400, reason: "No command provided" };
    }

    const command = comment.body.replace("/symbiote", "").trim().split(" ");

    if (command.length === 1) {
        switch (command[0]) {
            case "start":
                return await handleSymbioteServer(context, "start");
            case "restart":
                return await handleSymbioteServer(context, "restart");
            case "stop":
                return await handleSymbioteServer(context, "stop");
            default:
                return { status: 400, reason: "Unknown command" };
        }
    } else {
        throw logger.error(`Unknown command: ${command.join(" ")}`);
    }
}