import { Name } from "./interface.ts";
import { nameToString } from "./_utils.ts";

export class UndefinedError extends Error {
  public constructor(
    public target: Name<any>,
    public resolveStack: Name<any>[] = [],
  ) {
    super(`${nameToString(target)} is not defined!
resolve stack: ${
      resolveStack.map((target) => nameToString(target)).join(" -> ")
    }`);
    this.name = "UndefinedError";
  }
}

export class FrozenError extends Error {
  public constructor(
    public target: Name<any>,
  ) {
    super(`${nameToString(target)} is already frozen.`);
    this.name = "FrozenError";
  }
}
