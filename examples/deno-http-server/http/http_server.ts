import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
import { inject } from "../deps.ts";
import { TemplateEngine } from "../template/template_engine.ts";

export class HttpServer {
  @inject(TemplateEngine)
  templateEngine!: TemplateEngine;

  listen(port: number) {
    serve((req) => {
      return new Response(this.templateEngine.render(req), {
        headers: { "content-type": "text/html" },
      });
    }, { port });
  }
}
