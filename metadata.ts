import { monopole } from "./symbols.ts";
import type { MaybeThunk, ServiceIdentifier } from "./types.ts";

/** @internal */
export interface InjectProp<T> {
  property: keyof T;
  id: MaybeThunk<ServiceIdentifier<T>>;
  transformer?: (instance: T) => unknown;
}

/** @internal */
export interface ClassDefinitions<T> {
  injectProps: InjectProp<T>[];
}

/** @internal */
export function getClassDefinitions<T>(
  metadata: DecoratorMetadataObject,
): ClassDefinitions<T> {
  if (!metadata[monopole]) {
    metadata[monopole] = {
      injectProps: [],
    } satisfies ClassDefinitions<T>;
  }
  return metadata[monopole] as ClassDefinitions<T>;
}
