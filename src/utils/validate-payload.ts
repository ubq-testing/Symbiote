import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { SupportedCustomEvents } from "../types/index";
import { Value } from "@sinclair/typebox/value";
import { CustomEventSchemas, customEventSchemas } from "../types/custom-event-schemas";
import { isCustomEventGuard } from "../types/typeguards";

export function validateCallbackPayload<T extends SupportedCustomEvents = SupportedCustomEvents>({
  payload,
  logger,
  event,
}: {
  payload: unknown;
  logger: Logs;
  event: T;
}): CustomEventSchemas<T> {
  if (!isCustomEventGuard(event)) {
    throw new Error(`Invalid event: ${event}`);
  }

  const payloadSchema = customEventSchemas[event as keyof typeof customEventSchemas];

  const cleanedPayload = Value.Clean(payloadSchema, payload);
  if (!Value.Check(payloadSchema, cleanedPayload)) {
    const errors = [...Value.Errors(payloadSchema, cleanedPayload)];
    logger.error(`Invalid payload: ${errors.map((error) => error.message).join(", ")}`);
    throw new Error(`Invalid payload: ${errors.map((error) => error.message).join(", ")}`);
  }
  return Value.Decode(payloadSchema, Value.Default(payloadSchema, cleanedPayload));
}
