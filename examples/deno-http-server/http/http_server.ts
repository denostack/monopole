import { inject } from "../deps.ts";
import { TemplateEngine } from "../template/template_engine.ts";

export class HttpServer {
  @inject(TemplateEngine)
  templateEngine!: TemplateEngine;

  listen(port: number) {
    Deno.serve({ port }, (req) => {
      return new Response(this.templateEngine.render(req), {
        headers: { "content-type": "text/html" },
      });
    });
  }
}
