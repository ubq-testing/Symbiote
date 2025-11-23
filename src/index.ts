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
>(context: Context<T, TRuntime>, runtime: TRuntime) {
  const { logger } = context;
  let callbackResults: CallbackResult[] = [];

  if (isEdgeRuntimeCtx<T>(context, runtime)) {
    const results = await handleCallbacks(context, workerCallbacks);

    if ("status" in results) {
      throw logger.error(`Fatal error in callbacks: ${results.reason}`);
    }

    callbackResults = results;

  } else if (isActionRuntimeCtx<T>(context, runtime)) {
    console.log("Confirming action runtime");
    const results = await handleCallbacks(context, actionCallbacks);

    if ("status" in results) {
      throw logger.error(`Fatal error in callbacks: ${results.reason}`);
    }

    callbackResults = results;
  } else {
    throw logger.error(`Unsupported runtime: ${runtime}. Only worker and action runtimes are supported.`);
  }

  if (callbackResults.length) {
    for (const callback of callbackResults) {
      if (callback.status !== 200) {
        logger.error(`Error in callback: ${callback.reason}`);
        return { status: callback.status, reason: callback.reason };
      } else {
        logger.ok(`Callback successful: ${callback.reason}`);
      }
    }
  }

  return { status: 200, reason: "Success" };
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