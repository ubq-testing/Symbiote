import { Context, SupportedEvents, SymbioteRuntime } from "./context";

export function isCommentEvent(context: Context): context is Context<"issue_comment.created"> {
  return context.eventName === "issue_comment.created";
}

export function isEdgeRuntimeCtx<T extends SupportedEvents = SupportedEvents>(context: Context<T, SymbioteRuntime>): context is Context<T, "worker"> {
  return context.runtime === "worker";
}

export function isActionRuntimeCtx<T extends SupportedEvents = SupportedEvents>(context: Context<T, SymbioteRuntime>): context is Context<T, "action"> {
  return context.runtime === "action";
}
