import { ContainerFluent } from "./container_fluent.ts";
import { chain, type MaybePromise } from "./maybe_promise.ts";
import { Lifetime } from "./types.ts";

export class InstanceResolver<T> implements ContainerFluent<T> {
  resolver: () => MaybePromise<T>;
  resolved?: T;
  resolvedPromise?: Promise<T>;
  lifetime = Lifetime.Singleton;

  afterHandlers = [] as ((instance: T) => MaybePromise<void>)[];

  constructor(
    resolver: () => MaybePromise<T>,
  ) {
    this.resolver = resolver;
  }

  after(handler: (instance: T) => MaybePromise<void>): this {
    this.afterHandlers.push(handler);
    return this;
  }

  scope(lifetime: Lifetime): this {
    this.lifetime = lifetime;
    return this;
  }

  /** @internal */
  reset(): void {
    this.resolved = undefined;
    this.resolvedPromise = undefined;
  }

  /** @internal */
  resolve(): MaybePromise<T> {
    if (this.resolvedPromise) {
      return this.resolvedPromise;
    }
    if (this.resolved) {
      return this.resolved;
    }

    const value = chain(this.resolver())
      .next((value) => {
        if (this.lifetime !== Lifetime.Transient) {
          this.resolved = value;
        }
        return value;
      })
      .next((value) => {
        let c = chain();
        for (const handler of this.afterHandlers) {
          c = c.next(() => handler(value));
        }
        return c.next(() => value).value();
      })
      .next((value) => {
        this.resolvedPromise = undefined;
        return value;
      })
      .value();

    if (this.lifetime !== Lifetime.Transient && value instanceof Promise) {
      this.resolvedPromise = value;
    }

    return value;
  }
}
