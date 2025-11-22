import { Context } from "../../types";
import { SymbioteServer } from "../server/spawn-server";

export async function handleSymbioteServer(context: Context<"issue_comment.created", "worker">) {
    const server = new SymbioteServer(context);
    const result = await server.init();
    const { isRunning, needsRestart } = result;

    if (!needsRestart && isRunning) {
        return {
            status: "running",
            message: "Symbiote server is already running",
            data: result,
        }
    }

    if (needsRestart && !isRunning) {
        return {
            status: "starting",
            message: "Starting Symbiote server",
            data: await server.spawnServer(context),
        }
    }

    if (needsRestart && isRunning) {
        return {
            status: "restarting",
            message: "Restarting Symbiote server",
            data: await server.restartServer(context),
        }
    }



    throw new Error("Failed to check Symbiote server status");
}