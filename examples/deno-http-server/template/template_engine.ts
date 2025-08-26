export abstract class TemplateEngine {
  abstract render(request: Request): string;
}
