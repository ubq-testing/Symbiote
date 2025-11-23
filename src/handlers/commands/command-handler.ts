import { Command } from "../../types/command";
import { Context } from "../../types/index";
import { handleSymbioteServer } from "../worker/symbiote-server";

const commandHandlers = {
    "server": {
        "start": handleSymbioteServer,
        "restart": handleSymbioteServer,
        "stop": handleSymbioteServer,
    },
}

export async function handleCommand(context: Context<"issue_comment.created", "worker">) {
    const { payload: { comment }, logger } = context;

    if (!comment.body.startsWith("/symbiote")) {
        return { status: 400, reason: "No command provided" };
    }

    const command = comment.body.replace("/symbiote", "").trim().split(" ");

    if (command.length === 1) {
        switch (command[0]) {
            case "start":
            case "restart":
            case "stop":
                return await handleSymbioteServer(context);
            default:
                return { status: 400, reason: "Unknown command" };
        }
    } else {
        throw logger.error(`Unknown command: ${command.join(" ")}`);
    }
}