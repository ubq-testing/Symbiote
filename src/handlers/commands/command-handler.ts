import { Context, SupportedEvents } from "../../types/index";
import { handleSymbioteServer } from "../worker/symbiote-server";


type CommandString = `${string}.${string}`;

function parseCommand({
    command,
}: {
    command?: CommandString,
}) {
    if (!command) return;
    const [action, subAction] = command.split(".");
    return {
        action: action as keyof typeof commandHandlers,
        subAction: subAction as keyof typeof commandHandlers[keyof typeof commandHandlers]
    }
}

const commandHandlers = {
    "server": {
        "spawn": handleSymbioteServer,
        "restart": handleSymbioteServer,
        "stop": handleSymbioteServer,
    },
}

export async function handleCommand(context: Context<"issue_comment.created", "worker">) {
    const { command, logger } = context;
    const parsedCommand = parseCommand({ command: command?.action });
    if (!parsedCommand) return;
    const { action, subAction } = parsedCommand;
    const handler = commandHandlers[action][subAction];
    if (!handler) {
        throw logger.error(`Unknown command action: ${action}.${subAction}`, { command });
    }

    return await handler(context);
}