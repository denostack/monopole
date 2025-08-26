import type { Module } from "../deps.ts";
import { loggerModule } from "../logger/module.ts";
import { HttpServer } from "./http_server.ts";

export const httpModule: Module = {
  imports: [
    loggerModule,
  ],
  providers: [
    HttpServer,
  ],
  exports: [
    HttpServer,
  ],
};
