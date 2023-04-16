export type MaybePromise<T> = T | Promise<T>;

export function chain<T>(value: MaybePromise<T>) {
  return {
    next<TNext>(next: (value: T) => MaybePromise<TNext>) {
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
