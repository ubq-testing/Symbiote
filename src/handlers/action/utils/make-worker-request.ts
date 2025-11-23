import { CallbackResult } from "../../../types/callbacks";
import { Context, SupportedEvents } from "../../../types/index";

export async function makeWorkerRequest(context: Context<SupportedEvents, "action">): Promise<CallbackResult> {
  const {
    env: { WORKER_SECRET, WORKER_URL },
    logger,
    eventName,
    payload,
  } = context;

  logger.info(`Sending callback to: ${WORKER_URL}`);

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "X-GitHub-Event": eventName,
        "Content-Type": "application/json",
        Authorization: `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify(payload),
    });

    logger.info(`Response status: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Failed to send callback to worker: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const data = await response.json();
    logger.info(`Callback sent to worker: ${data.message}`);
    return { status: 200, reason: "Callback sent to worker", content: data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { status: 500, reason: `Error sending callback to worker: ${errorMessage}` };
  }
}
