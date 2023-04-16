import { chain, type MaybePromise } from "./maybe_promise.ts";
export class InstanceResolver<T> {
  resolver: () => MaybePromise<T>;
  resolved?: T;
  resolvedPromise?: Promise<T>;
  singleton = false;

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

  resolve(): MaybePromise<T> {
    if (this.resolvedPromise) {
      return this.resolvedPromise;
    }
    if (this.resolved) {
      return this.resolved;
    }

    const value = chain(this.resolver())
      .next((value) => {
        if (this.singleton) {
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

    if (this.singleton && value instanceof Promise) {
      this.resolvedPromise = value;
    }

    return value;
  }
}
