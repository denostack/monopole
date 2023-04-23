import { ContainerFluent } from "./container_fluent.ts";
import { chain, type MaybePromise } from "./maybe_promise.ts";
import { Lifetime } from "./types.ts";

export class InstanceResolver<T> implements ContainerFluent<T> {
  resolved?: T;
  resolvedPromise?: Promise<T>;
  // deno-lint-ignore ban-types
  resolvedMap?: WeakMap<object, T>;
  // deno-lint-ignore ban-types
  resolvedPromiseMap?: WeakMap<object, Promise<T>>;

  constructor(
    public _resolver: () => MaybePromise<T>,
    public _afterHandlers = [] as ((instance: T) => MaybePromise<void>)[],
    public _lifetime = Lifetime.Singleton,
  ) {
  }

  after(handler: (instance: T) => MaybePromise<void>): this {
    this._afterHandlers.push(handler);
    return this;
  }

  lifetime(lifetime: Lifetime): this {
    this._lifetime = lifetime;
    return this;
  }

  /** @internal */
  reset(): void {
    this.resolved = undefined;
    this.resolvedPromise = undefined;
  }

  /** @internal */
  resolve(
    // deno-lint-ignore ban-types
    scope: object,
  ): MaybePromise<T> {
    let resolvedPromise = this.resolvedPromise;
    if (resolvedPromise) {
      return resolvedPromise;
    } else if ((resolvedPromise = this.resolvedPromiseMap?.get(scope))) {
      return resolvedPromise;
    }
    let resolved = this.resolved;
    if (resolved) {
      return resolved;
    } else if ((resolved = this.resolvedMap?.get(scope))) {
      return resolved;
    }

    const value = chain(this._resolver())
      .next((value) => {
        if (this._lifetime === Lifetime.Singleton) {
          this.resolved = value;
        } else if (this._lifetime === Lifetime.Scoped) {
          this.resolvedMap ??= new WeakMap();
          this.resolvedMap.set(scope, value);
        }
        return value;
      })
      .next((value) => {
        let c = chain();
        for (const handler of this._afterHandlers) {
          c = c.next(() => handler(value));
        }
        return c.next(() => value).value();
      })
      .next((value) => {
        this.resolvedPromise = undefined;
        this.resolvedPromiseMap?.delete(scope);
        return value;
      })
      .value();

    if (value instanceof Promise) {
      if (this._lifetime === Lifetime.Singleton) {
        this.resolvedPromise = value;
      } else if (this._lifetime === Lifetime.Scoped) {
        this.resolvedPromiseMap ??= new WeakMap();
        this.resolvedPromiseMap.set(scope, value);
      }
    }

    return value;
  }
}
