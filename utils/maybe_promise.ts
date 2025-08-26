import type { MaybePromise } from "../types.ts";

/** @internal */
export interface MaybePromiseWrapper<T> {
  next<TNext>(
    next: (value: T) => MaybePromise<TNext>,
  ): MaybePromiseWrapper<TNext>;
  value(): MaybePromise<T>;
}

/** @internal */
export function chain(): MaybePromiseWrapper<void>;
export function chain<T>(value: MaybePromise<T>): MaybePromiseWrapper<T>;
export function chain(
  value?: MaybePromise<unknown>,
): MaybePromiseWrapper<unknown> {
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

export function all<T>(values: MaybePromise<T>[]): MaybePromiseWrapper<T[]> {
  if (values.some((value) => value instanceof Promise)) {
    return chain(Promise.all(values));
  } else {
    return chain(values as T[]);
  }
}

/** @internal */
export function promisify<T>(value: MaybePromise<T>): Promise<T> {
  if (value instanceof Promise) {
    return value;
  } else {
    return Promise.resolve(value);
  }
}
