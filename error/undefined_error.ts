import { toString } from "../utils/service_identifier.ts";
import type { ServiceIdentifier } from "../types.ts";

export interface StackItem {
  id: ServiceIdentifier<unknown>;
  alias?: true;
}

export class UndefinedError extends Error {
  resolveStack: string[];

  constructor(
    public id: ServiceIdentifier<unknown>,
    cause?: UndefinedError,
  ) {
    super(`${toString(id)} is undefined!`);
    this.name = "UndefinedError";
    this.resolveStack = [
      toString(id),
      ...(cause?.resolveStack ?? []),
    ];
  }
}
