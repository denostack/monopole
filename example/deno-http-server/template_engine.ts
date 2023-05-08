import { Container, Inject, Lifetime, Module, SYMBOL_SCOPE } from "./deps.ts";

export abstract class TemplateEngine {
  abstract render(): string;
}

export class HtmlTemplateEngine extends TemplateEngine {
  @Inject(Request)
  request!: Request;

  render() {
    return `<html><body>${this.request.method} - ${this.request.url}</body></html>`;
  }
}

export class TemplateModule implements Module {
  provide(container: Container) {
    container.alias(Request, SYMBOL_SCOPE);
    container.bind(TemplateEngine, HtmlTemplateEngine).lifetime(
      Lifetime.Scoped,
    );
  }
}
