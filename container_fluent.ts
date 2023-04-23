import { MaybePromise } from "./maybe_promise.ts";
import { Lifetime } from "./types.ts";

export interface ContainerFluent<T> {
  after(handler: (value: T) => MaybePromise<void>): ContainerFluent<T>;
  lifetime(Lifetime: Lifetime): ContainerFluent<T>;
}
