import type { ServiceIdentifier } from "../types.ts";
import { toString } from "../utils/service_identifier.ts";

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
    const idString = toString(id);
    const resolveStack = [
      idString,
      ...(cause?.resolveStack ?? []),
    ];
    super(
      `${idString} is undefined!`,
    );
    this.name = "UndefinedError";
    this.resolveStack = resolveStack;
  }
}
