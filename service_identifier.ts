import type { AbstractType, ConstructType } from "./types.ts";

export type ServiceIdentifier<T> =
  | ConstructType<T>
  | AbstractType<T>
  | string
  | symbol;

export function toString(name: ServiceIdentifier<unknown>): string {
  if (typeof name === "string") {
    return `"${name.replace(/"/g, '\\"')}"`;
  }
  if (typeof name === "symbol") {
    return name.toString();
  }
  if (typeof name === "function") {
    if (name.toString().startsWith("class ")) {
      return name.name ? `[class ${name.name}]` : "[anonymous class]";
    }
    return name.name ? `[function ${name.name}]` : "[anonymous function]";
  }
  return name.toString();
}
