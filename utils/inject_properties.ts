import type { ClassDefinitions, InjectProp } from "../metadata.ts";
import { monopole } from "../symbols.ts";
import type { MaybePromise, ServiceIdentifier } from "../types.ts";
import { all, chain } from "./maybe_promise.ts";
import { resolveMaybeThunk } from "./thunk.ts";

const IGNORED_CONSTRUCTORS = new Set([
  Object,
  Object.getPrototypeOf(Object),
  null,
]);

/** @internal */
export function injectProperties<T>(
  value: T,
  resolve: (id: ServiceIdentifier) => MaybePromise<unknown>,
): MaybePromise<T> {
  if (!isObject(value)) {
    return value;
  }
  const properties = findAllInject<T>(value);
  return all(properties.map(({ id, property, transformer }) => {
    return chain(resolve(resolveMaybeThunk(id))).next((resolved) => ({
      property,
      dependency: (transformer?.(resolved as T) ?? resolved) as T[keyof T],
    })).value();
  })).next((deps) => {
    for (const { property, dependency } of deps) {
      (value as T)[property] = dependency;
    }
    return value;
  }).value();
}

function findAllInject<T>(value: object) {
  const properties: InjectProp<T>[] = [];
  const alreadyDefinedProperties = new Set<PropertyKey>();
  let ctor = value.constructor;
  while (!IGNORED_CONSTRUCTORS.has(ctor)) {
    const metadataStorage = ctor[Symbol.metadata]?.[monopole] as
      | ClassDefinitions<T>
      | undefined;
    const props = metadataStorage?.injectProps;
    if (props) {
      for (const prop of props) {
        if (alreadyDefinedProperties.has(prop.property)) {
          continue;
        }
        alreadyDefinedProperties.add(prop.property);
        properties.push(prop as InjectProp<T>);
      }
    }
    ctor = Object.getPrototypeOf(ctor);
  }
  return properties;
}

function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}
