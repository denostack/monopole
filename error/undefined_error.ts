import { ServiceIdentifier, toString } from "../service_identifier.ts";

export interface StackItem {
  id: ServiceIdentifier<unknown>;
  alias?: true;
}

function resolveStackToString(stack: StackItem[]): string {
  return stack.map((item, itemIndex) => {
    if (item.alias) {
      return `  [${itemIndex}] (alias) ${toString(item.id)}`;
    }
    return `  [${itemIndex}] ${toString(item.id)}`;
  }).join("\n");
}

export class UndefinedError extends Error {
  resolveStack: StackItem[];

  constructor(
    public target: ServiceIdentifier<unknown>,
    aliasStack: ServiceIdentifier<unknown>[],
    beforeStack: StackItem[] = [],
  ) {
    const resolveStack: StackItem[] = [
      ...aliasStack.map((alias) => ({ id: alias, alias: true as const })),
      { id: target },
      ...beforeStack,
    ];
    super(`${toString(target)} is undefined!
resolve stack:
${resolveStackToString(resolveStack)}`);
    this.resolveStack = resolveStack;
    this.name = "UndefinedError";
  }
}
