import type { MaybePromise } from "./types.ts";

/** @internal */
export interface MaybePromiseChain<T> {
  next<TNext>(
    next: (value: T) => MaybePromise<TNext>,
  ): MaybePromiseChain<TNext>;
  value(): MaybePromise<T>;
}

/** @internal */
export function chain(): MaybePromiseChain<void>;
export function chain<T>(value: MaybePromise<T>): MaybePromiseChain<T>;
export function chain(
  value?: MaybePromise<unknown>,
): MaybePromiseChain<unknown> {
  return {
    next(next) {
      if (value instanceof Promise) {
        return chain(value.then(next));
      } else {
        return chain(next(value));
      }
    },
    value() {
      return value;
    },
  };
}

/** @internal */
export function promisify<T>(value: MaybePromise<T>): Promise<T> {
  if (value instanceof Promise) {
    return value;
  } else {
    return Promise.resolve(value);
  }
}
