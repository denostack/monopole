import { getClassDefinitions, type InjectProp } from "../metadata.ts";
import type { MaybeThunk, ServiceIdentifier } from "../types.ts";

export function inject<T>(
  id: MaybeThunk<ServiceIdentifier<T>>,
  transformer?: (instance: T) => unknown,
): (
  _: undefined,
  ctx: ClassFieldDecoratorContext,
) => void {
  return (_: undefined, ctx: ClassFieldDecoratorContext) => {
    defineInject<T>(ctx.metadata, ctx.name as keyof T, id, transformer);
  };
}

export function defineInject<T>(
  metadata: DecoratorMetadataObject,
  property: keyof T,
  id: MaybeThunk<ServiceIdentifier<T>>,
  transformer?: (instance: T) => unknown,
) {
  getClassDefinitions<T>(metadata).injectProps.push({
    property,
    id,
    transformer,
  } as InjectProp<T>);
}
