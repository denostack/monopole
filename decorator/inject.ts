import {
  type ClassMetadataStorage,
  createClassMetadataStorage,
  type MetadataInjectProp,
} from "../metadata.ts";
import type { ServiceIdentifier } from "../service_identifier.ts";
import { monopole } from "../symbols.ts";

export function inject<T>(
  id: ServiceIdentifier<T>,
  transformer?: (instance: T) => unknown,
): (
  _: undefined,
  ctx: ClassFieldDecoratorContext,
) => void {
  return (_: undefined, ctx: ClassFieldDecoratorContext) => {
    const storage = ctx.metadata[monopole] =
      ctx.metadata[monopole] as ClassMetadataStorage<T> ||
      createClassMetadataStorage<T>();

    defineInject<T>(storage, ctx.name as keyof T, id, transformer);
  };
}

export function defineInject<T>(
  storage: ClassMetadataStorage<T>,
  property: keyof T,
  id: ServiceIdentifier<T>,
  transformer?: (instance: T) => unknown,
) {
  storage.injectProps.push({
    property,
    id,
    transformer,
  } as MetadataInjectProp<T>);
}
