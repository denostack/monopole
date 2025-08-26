import type { MaybeThunk } from "../types.ts";

const RE_ARROW_FUNCTION = /\(\)\s*=>/;

export function isThunk(value: unknown): value is () => unknown {
  return typeof value === "function" &&
    typeof value.prototype === "undefined" &&
    RE_ARROW_FUNCTION.test(`${value}`);
}

export function resolveMaybeThunk<T>(value: MaybeThunk<T>): T {
  return isThunk(value) ? value() : value;
}
