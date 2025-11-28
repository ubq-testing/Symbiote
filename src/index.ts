import { Context, SupportedEvents, SymbioteRuntime } from "./types/index";
import { workerCallbacks } from "./handlers/worker-callbacks";
import { isActionRuntimeCtx, isEdgeRuntimeCtx } from "./types/typeguards";
import { CallbackResult, HandlerCallbacks } from "./types/callbacks";
import { actionCallbacks } from "./handlers/action-callbacks";

/**
 * The main plugin function. Split for easier testing.
 */
export async function runSymbiote<
  T extends SupportedEvents = SupportedEvents,
  TRuntime extends SymbioteRuntime = SymbioteRuntime
>(context: Context<T, TRuntime>) {
  const { logger } = context;
  let callbackResults: CallbackResult[] = [];

  logger.info(`Running symbiote for event: ${context.eventName} in runtime: ${context.runtime}`);
  logger.info(`Context: ${JSON.stringify(context.payload)}`);

  if (isEdgeRuntimeCtx<T>(context)) {
    const results = await handleCallbacks<T, "worker">(context, workerCallbacks);

    if ("status" in results) {
      logger.warn(`Fatal error in callbacks: ${results.reason}`);
      return {
        status: results.status,
        reason: results.reason,
        content: JSON.stringify(results),
      };
    }

    callbackResults = results;

  } else if (isActionRuntimeCtx<T>(context)) {
    const results = await handleCallbacks<T, "action">(context, actionCallbacks);

    if ("status" in results) {
      logger.warn(`Fatal error in callbacks: ${results.reason}`);
      return {
        status: results.status,
        reason: results.reason,
        content: JSON.stringify(results),
      };
    
    }

    callbackResults = results;
  } else {
    throw logger.error(`Unsupported runtime: ${context.runtime}. Only worker and action runtimes are supported.`);
  }

  const errorMessages = callbackResults.map((callback) => callback.status !== 200 ? callback.reason : null).filter((message) => message !== null);
  const errorMessage = errorMessages.join(", ");
  
  if (errorMessages.length > 0) {
    return { status: 500, reason: errorMessage, content: JSON.stringify(callbackResults) };
  }

  return { status: 200, reason: "Success", content: JSON.stringify(callbackResults) };
}

async function handleCallbacks<
  T extends SupportedEvents = SupportedEvents,
  TRuntime extends SymbioteRuntime = SymbioteRuntime
>(
  context: Context<T, TRuntime>,
  callbacks: HandlerCallbacks<T, TRuntime>
) {
  const { logger, eventName } = context;

  const eventCallbacks = callbacks[eventName as keyof typeof callbacks];
  if (!eventCallbacks || !eventCallbacks?.length) {
    logger.error(`No callbacks found for event: ${eventName}`);
    return { status: 404, reason: "No callbacks found" };
  }

  return await Promise.all(eventCallbacks.map((callback) => callback(context)));
}