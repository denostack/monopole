// deno-lint-ignore-file no-explicit-any

export type Constructor<T = object, A extends any[] = any[]> = new (...args: A) => T;
export type AbstractConstructor<T = object, A extends any[] = any[]> = abstract new (...args: A) => T;

export type MaybePromise<T> = T | Promise<T>;

export type Thunk<T> = () => T;
export type MaybeThunk<T> = T | Thunk<T>;

export type ServiceIdentifier<T = any> =
  | Constructor<T>
  | AbstractConstructor<T>
  | string
  | symbol;
