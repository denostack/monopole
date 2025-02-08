import type { Container } from "../container.ts";
import { chain } from "../maybe_promise.ts";
import type { ClassMetadataStorage, MetadataInjectProp } from "../metadata.ts";
import { monopole } from "../symbols.ts";
import type { AfterResolveHandler, MaybePromise } from "../types.ts";

const ignoreCtors = new Set([
  Object,
  Object.getPrototypeOf(Object),
  null,
]);

/** @internal */
export function afterResolve<T>(
  value: T,
  afterHandlers: AfterResolveHandler<T>[],
): MaybePromise<T> {
  if (afterHandlers.length === 0) {
    return value;
  }
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
): Promise<T> {
  if (!isObject(value)) {
    return Promise.resolve(value);
  }
  const properties = findAllInject<T>(value);
  return Promise.all(properties.map(({ id, property, transformer }) => {
    return container.resolve(id).then((resolved) => ({
      property,
      dependency: (transformer?.(resolved) ?? resolved) as T[keyof T],
    }));
  })).then((deps) => {
    for (const { property, dependency } of deps) {
      (value as T)[property] = dependency;
    }
    return value;
  });
}

function findAllInject<T>(value: object) {
  const properties: MetadataInjectProp<T>[] = [];
  const alreadyDefinedProperties = new Set<PropertyKey>();
  let ctor = value.constructor;
  while (!ignoreCtors.has(ctor)) {
    const metadataStorage = ctor[Symbol.metadata]?.[monopole] as
      | ClassMetadataStorage<T>
      | undefined;
    const props = metadataStorage?.injectProps;
    if (props) {
      for (const prop of props) {
        if (alreadyDefinedProperties.has(prop.property)) {
          continue;
        }
        alreadyDefinedProperties.add(prop.property);
        properties.push(prop as MetadataInjectProp<T>);
      }
    }
    ctor = Object.getPrototypeOf(ctor);
  }
  return properties;
}

function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}
