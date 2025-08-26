import { createContainer } from "./deps.ts";
import { HttpServer } from "./http/http_server.ts";
import { httpModule } from "./http/module.ts";

await using app = await createContainer(httpModule);

await app.get(HttpServer).listen(8888);
