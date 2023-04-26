import { ServiceIdentifier, toString } from "../service_identifier.ts";

export interface StackItem {
  id: ServiceIdentifier<unknown>;
  alias?: true;
}

function resolveStackToString(stack: StackItem[]): string {
  let result = "resolve stack:";
  for (const [itemIndex, item] of stack.entries()) {
    if (item.alias) {
      result += `\n  [${itemIndex}] (alias) ${toString(item.id)}`;
    } else {
      result += `\n  [${itemIndex}] ${toString(item.id)}`;
    }
  }
  return result;
}

export class UndefinedError extends Error {
  resolveStack: StackItem[] & { toString(): string };

  constructor(
    public target: ServiceIdentifier<unknown>,
    aliasStack: ServiceIdentifier<unknown>[] = [],
    beforeStack: StackItem[] = [],
  ) {
    super(`${toString(target)} is undefined!`);
    this.name = "UndefinedError";
    this.resolveStack = new Proxy([
      ...aliasStack.map((alias) => ({ id: alias, alias: true as const })),
      { id: target },
      ...beforeStack,
    ], {
      get(target, prop) {
        if (prop === "toString") {
          return () => resolveStackToString(target);
        }
        return Reflect.get(target, prop);
      },
    });
  }
}
