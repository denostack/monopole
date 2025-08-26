import { Logger } from "./logger.ts";

export class ConsoleLogger extends Logger {
  info(...data: unknown[]): void {
    console.log(...data);
  }

  error(...data: unknown[]): void {
    console.error(...data);
  }
}
