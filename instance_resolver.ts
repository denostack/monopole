import { chain, type MaybePromise } from "./maybe_promise.ts";
export class InstanceResolver<T> {
  resolver: () => MaybePromise<T>;
  resolved?: T;
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
    if (this.resolved) {
      return this.resolved;
    }
    return chain(this.resolver())
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
      .value();
  }
}
