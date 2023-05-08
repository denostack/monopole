import { serve } from "https://deno.land/std@0.184.0/http/server.ts";
import {
  Container,
  Inject,
  Lifetime,
  Module,
  SYMBOL_ROOT_CONTAINER,
} from "./deps.ts";
import { TemplateEngine } from "./template_engine.ts";

export class HttpServer {
  @Inject(SYMBOL_ROOT_CONTAINER) // root container
  container!: Container;

  listen(port: number) {
    serve(async (req) => {
      const scopedContainer = await this.container.scope(req);
      const template = scopedContainer.get(TemplateEngine);
      return new Response(template.render(), {
        headers: { "content-type": "text/html" },
      });
    }, { port });
  }
}

export class HttpModule implements Module {
  provide(container: Container) {
    container.bind(HttpServer).lifetime(Lifetime.Singleton);
  }
}
