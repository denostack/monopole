import type { Module } from "../deps.ts";
import { HtmlTemplateEngine } from "./html_template_engine.ts";
import { TemplateEngine } from "./template_engine.ts";

export const templateModule: Module = {
  providers: [
    { id: TemplateEngine, useClass: HtmlTemplateEngine },
  ],
  exports: [
    TemplateEngine,
  ],
};
