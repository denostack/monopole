import { UndefinedError } from "../error/undefined_error.ts";
import type { MaybePromise, ServiceIdentifier, Thunk } from "../types.ts";
import { injectProperties } from "./inject_properties.ts";
import { chain } from "./maybe_promise.ts";

/** @internal */
export interface CreateResolverServiceParams {
  resolvers: Map<ServiceIdentifier, Thunk<MaybePromise<unknown>>>;
  resolvedValues: Map<ServiceIdentifier, unknown>;
  importedValues: Map<ServiceIdentifier, unknown>;
}

/** @internal */
export function createResolveService(
  { resolvers, resolvedValues, importedValues }: CreateResolverServiceParams,
) {
  const resolvedPromises = new Map<ServiceIdentifier, Promise<unknown>>();
  return function resolveService<T>(id: ServiceIdentifier<T>): MaybePromise<T> {
    if (resolvedValues.has(id)) {
      return resolvedValues.get(id) as T;
    }
    if (importedValues.has(id)) {
      return importedValues.get(id) as T;
    }
    const promise = resolvedPromises.get(id);
    if (promise) {
      return promise as Promise<T>;
    }
    const resolver = resolvers.get(id);
    if (!resolver) {
      throw new UndefinedError(id);
    }
    try {
      const value = chain(resolver())
        .next((value) => (resolvedValues.set(id, value), value))
        .next((value) => injectProperties(value, resolveService))
        .value();

      if (value instanceof Promise) {
        resolvedPromises.set(id, value);
        return value.catch((e) => {
          if (e instanceof UndefinedError) {
            throw new UndefinedError(id, e);
          } else {
            throw e;
          }
        });
      }

      return value as T;
    } catch (e) {
      if (e instanceof UndefinedError) {
        throw new UndefinedError(id, e);
      } else {
        throw e;
      }
    }
  };
}
