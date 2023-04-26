import { Container } from "../container.ts";
import { all, chain } from "../maybe_promise.ts";
import { metadata, MetadataInjectProp } from "../metadata.ts";
import { AfterResolveHandler, MaybePromise } from "../types.ts";

/** @internal */
export function afterResolve<T>(
  value: T,
  afterHandlers: AfterResolveHandler<T>[],
): MaybePromise<T> {
  let c = chain();
  for (const handler of afterHandlers) {
    c = c.next(() => handler(value));
  }
  return c.next(() => value).value();
}

/** @internal */
export function injectProperties<T>(
  value: T,
  container: Container,
): MaybePromise<T> {
  if (value === null || typeof value !== "object") {
    return value;
  }
  const properties =
    (metadata.inject.get(value.constructor) ?? []) as MetadataInjectProp<T>[];
  return all(properties.map(({ id, property, transformer }) => {
    return chain(container.resolve(id)).next((resolved) => {
      return {
        property,
        dependency: (transformer?.(resolved) ?? resolved) as T[keyof T],
      };
    }).value();
  })).next((deps) => {
    for (const { property, dependency } of deps) {
      (value as T)[property] = dependency;
    }
    return value;
  }).value();
}
