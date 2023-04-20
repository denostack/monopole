export type ConstructType<T> = { new (...args: unknown[]): T };
export type AbstractType<T> = {
  readonly prototype: T;
};
