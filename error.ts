import { Name } from "./interface.ts";
import { nameToString } from "./_utils.ts";

function resolveStackToString(stack: Name<any>[]): string {
  return stack.map((target, targetIndex) =>
    `  [${targetIndex}] ${nameToString(target)}`
  ).join("\n");
}

export class UndefinedError extends Error {
  public resolveStack: Name<any>[];

  constructor(
    public target: Name<any>,
    beforeStack: Name<any>[] = [],
  ) {
    const resolveStack = [target, ...beforeStack];
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
