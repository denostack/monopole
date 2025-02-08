import type { Container } from "../container.ts";
import { chain } from "../maybe_promise.ts";
import type { Provider } from "../provider.ts";
import type { MaybePromise } from "../types.ts";
import { afterResolve, injectProperties } from "./utils.ts";

const resolvedCache = new WeakMap<Container, Map<Provider<unknown>, unknown>>();

function storeCache<T>(
  container: Container,
  provider: Provider<T>,
  value: MaybePromise<T>,
) {
  let cacheValues = resolvedCache.get(container);
  if (!cacheValues) {
    cacheValues = new Map();
    resolvedCache.set(container, cacheValues);
  }
  cacheValues.set(provider as Provider<unknown>, value);
}

function getCache<T>(
  container: Container,
  provider: Provider<T>,
) {
  const cacheValues = resolvedCache.get(container);
  if (!cacheValues) {
    return;
  }
  return cacheValues.get(provider as Provider<unknown>);
}

export function resolveSingleton<T>(
  container: Container,
  provider: Provider<T>,
): MaybePromise<T> {
  const cached = getCache(container, provider);
  if (cached) {
    return cached as MaybePromise<T>;
  }

  const value = chain(provider.resolver())
    .next((value) => (storeCache(container, provider, value), value))
    .next((value) => injectProperties(value, container))
    .next((value) => afterResolve<T>(value, provider.afterHandlers))
    .value();

  if (value instanceof Promise) {
    storeCache(container, provider, value);
  }

  return value;
}
