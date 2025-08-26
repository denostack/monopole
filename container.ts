import type { ServiceIdentifier } from "./types.ts";

export abstract class Container implements AsyncDisposable {
  abstract entries(): IterableIterator<[ServiceIdentifier, unknown]>;
  abstract get<T>(id: ServiceIdentifier<T>): T;
  abstract has<T>(id: ServiceIdentifier<T>): boolean;
  abstract dispose(): Promise<void>;

  [Symbol.asyncDispose]() {
    return this.dispose();
  }
}
