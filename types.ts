export type ConstructType<T> = { new (...args: unknown[]): T };
export type AbstractType<T> = {
  readonly prototype: T;
};

export type MaybePromise<T> = T | Promise<T>;

export enum Lifetime {
  Transient = "transient",
  Singleton = "singleton",
  Scoped = "scoped",
}

export interface Resolver<T> {
  (): MaybePromise<T>;
}

export interface AfterResolveHandler<T> {
  (instance: T): MaybePromise<void>;
}
