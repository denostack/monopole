import type { ServiceIdentifier } from "../types.ts";

export function toString(id: ServiceIdentifier<unknown>): string {
  if (typeof id === "string") {
    return JSON.stringify(id);
  }
  if (typeof id === "symbol") {
    return id.toString();
  }
  if (typeof id === "function") {
    if (id.toString().startsWith("class ")) {
      return id.name ? `[class ${id.name}]` : "[anonymous class]";
    }
    return id.name ? `[function ${id.name}]` : "[anonymous function]";
  }
  return `${id}`;
}
