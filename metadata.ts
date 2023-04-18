import { ServiceIdentifier } from "./service_identifier.ts";
import { ConstructType } from "./types.ts";

export interface MetadataInjectProp<T> {
  target: ConstructType<T>;
  property: keyof T;
  id: ServiceIdentifier<T>;
  transformer?: (instance: T) => unknown;
}

export const metadata = {
  // deno-lint-ignore ban-types
  inject: new WeakMap<object, MetadataInjectProp<unknown>[]>(),
};

/* @internal for test */
export function clearMetadata() {
  metadata.inject = new WeakMap();
}
