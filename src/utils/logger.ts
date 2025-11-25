import { LogLevel, Logs } from "@ubiquity-os/ubiquity-os-logger";

export function createLogger(logLevel: LogLevel) {
    return new Logs(logLevel);
  }
