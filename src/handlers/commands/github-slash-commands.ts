import { Context } from "../../types/index";
import { handleSymbioteServer } from "../worker/symbiote-server";

export async function handleCommand(context: Context<"issue_comment.created", "worker">) {
    const { payload: { comment }, logger } = context;

    if (!comment.body.startsWith("/symbiote")) {
        return { status: 400, reason: "No command provided" };
    }

    const commandText = comment.body.replace("/symbiote", "").trim();
    
    // Validate that a command was provided
    if (!commandText) {
        return { status: 400, reason: "No command provided. Usage: /symbiote <start|restart|stop>" };
    }

    const command = commandText.split(" ");

    // Only single-word commands are supported
    if (command.length === 1) {
        switch (command[0]) {
            case "start":
                return await handleSymbioteServer(context, "start");
            case "restart":
                return await handleSymbioteServer(context, "restart");
            case "stop":
                return await handleSymbioteServer(context, "stop");
            default:
                return { status: 400, reason: `Unknown command: ${command[0]}. Supported commands: start, restart, stop` };
        }
    } else {
        const errorMessage = `Invalid command format: ${command.join(" ")}. Only single-word commands are supported.`;
        logger.error(errorMessage);
        return { status: 400, reason: errorMessage };
    }
}