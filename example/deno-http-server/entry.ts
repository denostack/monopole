import { createContainer } from "./deps.ts";
import { HttpModule, HttpServer } from "./http_server.ts";
import { TemplateModule } from "./template_engine.ts";

const container = createContainer();

container.register(new TemplateModule());
container.register(new HttpModule());

await container.boot();

container.get(HttpServer).listen(8888);
