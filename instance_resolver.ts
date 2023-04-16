import { ContainerFluent } from "./container_fluent.ts";
import { MaybePromise } from "./types.ts";

export class InstanceResolver<T> implements ContainerFluent<T> {
  _resolver: () => MaybePromise<T>;
  _afterHandlers = [] as ((instance: T) => void)[];

  constructor(
    resolver: () => MaybePromise<T>,
  ) {
    this._resolver = resolver;
  }

  after(handler: (instance: T) => void): this {
    this._afterHandlers.push(handler);
    return this;
  }

  resolve(): MaybePromise<T> {
    const resolved = this._resolver();
    if (resolved instanceof Promise) {
      return resolved.then((value) => {
        this._afterHandlers.forEach((handler) => handler(value));
        return value;
      }) as Promise<T>;
    }
    this._afterHandlers.forEach((handler) => handler(resolved));
    return resolved;
  }
}
