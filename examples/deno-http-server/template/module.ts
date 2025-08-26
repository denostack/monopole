import type { Container, Module } from "../deps.ts";
import { HtmlTemplateEngine } from "./html_template_engine.ts";
import { TemplateEngine } from "./template_engine.ts";

export class TemplateModule implements Module {
  boot(container: Container) {
    container.registerClass(TemplateEngine, HtmlTemplateEngine);
  }
}
