export type ConstructType<T> = { new (...args: unknown[]): T };
export type AbstractType<T> = {
  readonly prototype: T;
};

export enum Lifetime {
  Transient = "transient",
  Singleton = "singleton",
  Scoped = "scoped",
}
