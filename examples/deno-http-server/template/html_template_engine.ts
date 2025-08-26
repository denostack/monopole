import { TemplateEngine } from "./template_engine.ts";

export class HtmlTemplateEngine extends TemplateEngine {
  render(request: Request) {
    return `<html><body>${request.method} - ${request.url}</body></html>`;
  }
}
