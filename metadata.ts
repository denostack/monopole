import type { ServiceIdentifier } from "./service_identifier.ts";

export interface MetadataInjectProp<T> {
  property: keyof T;
  id: ServiceIdentifier<T>;
  transformer?: (instance: T) => unknown;
}

export interface ClassMetadataStorage<T> {
  injectProps: MetadataInjectProp<T>[];
}

export function createClassMetadataStorage<T>(): ClassMetadataStorage<T> {
  return {
    injectProps: [],
  };
}
