// deno-lint-ignore-file no-explicit-any

export interface ConstructType<T> extends Function {
  new (...args: unknown[]): T;
}

export interface AbstractType<T> extends Function {
  readonly prototype: T;
}

export type MaybePromise<T> = T | Promise<T>;

export type Thunk<T> = () => T;
export type MaybeThunk<T> = T | Thunk<T>;

export type ServiceIdentifier<T = any> =
  | ConstructType<T>
  | AbstractType<T>
  | string
  | symbol;
