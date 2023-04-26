import { ContainerFluent } from "./container_fluent.ts";
import { Provider } from "./provider.ts";
import { Lifetime, MaybePromise } from "./types.ts";

export class ProviderDescriptor<T> implements ContainerFluent<T> {
  constructor(public provider: Provider<T>) {}

  after(handler: (instance: T) => MaybePromise<void>): this {
    this.provider.afterHandlers.push(handler);
    return this;
  }

  lifetime(lifetime: Lifetime): this {
    this.provider.lifetime = lifetime;
    return this;
  }
}
