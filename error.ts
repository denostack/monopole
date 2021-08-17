import { Name } from "./interface.ts";
import { nameToString } from "./_utils.ts";

export type StackItem = Name<any> | { alias: Name<any> };

function isAlias(stackItem: any): stackItem is { alias: Name<any> } {
  return typeof stackItem === "object" && stackItem.alias;
}

function resolveStackToString(stack: StackItem[]): string {
  return stack.map((target, targetIndex) => {
    if (isAlias(target)) {
      return `  [${targetIndex}] (alias) ${nameToString(target.alias)}`;
    }
    return `  [${targetIndex}] ${nameToString(target)}`;
  }).join("\n");
}

export class UndefinedError extends Error {
  public resolveStack: StackItem[];

  constructor(
    public target: Name<any>,
    aliasNames: Name<any>[],
    beforeStack: StackItem[] = [],
  ) {
    const resolveStack = [
      ...aliasNames.map((alias) => ({ alias })),
      target,
      ...beforeStack,
    ];
    super(`${nameToString(target)} is undefined!
resolve stack:
${resolveStackToString(resolveStack)}`);
    this.resolveStack = resolveStack;
    this.name = "UndefinedError";
  }
}

export class FrozenError extends Error {
  constructor(
    public target: Name<any>,
  ) {
    super(`${nameToString(target)} is already frozen.`);
    this.name = "FrozenError";
  }
}
