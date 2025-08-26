import { Container } from "./container.ts";
import { UndefinedError } from "./error/undefined_error.ts";
import type { ServiceIdentifier } from "./types.ts";

export class ContainerContext extends Container {
  _disposed?: Promise<void>; // closing promise (promise lock)

  constructor(
    readonly importedContainers: Container[],
    readonly _storage: Map<ServiceIdentifier, unknown>,
    readonly disposeHandler?: () => Promise<void>,
  ) {
    super();
  }

  entries(): IterableIterator<[ServiceIdentifier, unknown]> {
    return this._storage.entries();
  }

  get<T>(id: ServiceIdentifier<T>): T {
    if (this._storage.has(id)) {
      return this._storage.get(id) as T;
    }
    throw new UndefinedError(id);
  }

  has<T>(id: ServiceIdentifier<T>): boolean {
    return this._storage.has(id);
  }

  dispose(): Promise<void> {
    if (!this._disposed) {
      this._disposed = Promise.all(
        this.importedContainers.map((m) => m.dispose()),
      ).then(() => this.disposeHandler?.());
    }
    return this._disposed;
  }
}
