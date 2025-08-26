import { Module } from "../../../mod.ts";
import { ConsoleLogger } from "./console_logger.ts";
import { Logger } from "./logger.ts";

export const loggerModule: Module = {
  providers: [
    ConsoleLogger,
    { id: Logger, useExisting: ConsoleLogger },
  ],
  exports: [
    Logger,
    ConsoleLogger,
  ],
};
