import type { Lifetime, MaybePromise } from "./types.ts";

export interface ContainerFluent<T> {
  after(handler: (value: T) => MaybePromise<void>): ContainerFluent<T>;
  lifetime(Lifetime: Lifetime): ContainerFluent<T>;
}
