import { createContainer } from "./deps.ts";
import { HttpServer } from "./http/http_server.ts";
import { httpModule } from "./http/module.ts";
import { templateModule } from "./template/module.ts";

await using app = await createContainer({
  imports: [
    httpModule,
    templateModule,
  ],
  exports: [
    HttpServer,
  ],
});

await app.get(HttpServer).listen(8888);
