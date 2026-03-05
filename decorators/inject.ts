import { getClassDefinitions, type InjectProp } from "../metadata.ts";
import type { MaybeThunk, ServiceIdentifier } from "../types.ts";

export function inject<T>(
  id: MaybeThunk<ServiceIdentifier<T>>,
): (_: undefined, ctx: ClassFieldDecoratorContext<unknown, T>) => void;
export function inject<T, F>(
  id: MaybeThunk<ServiceIdentifier<T>>,
  transformer: (instance: T) => F,
): (_: undefined, ctx: ClassFieldDecoratorContext<unknown, F>) => void;
export function inject(
  id: MaybeThunk<ServiceIdentifier<unknown>>,
  transformer?: (instance: unknown) => unknown,
): (
  _: undefined,
  ctx: ClassFieldDecoratorContext,
) => void {
  return (
    _: undefined,
    ctx: ClassFieldDecoratorContext,
  ) => {
    defineInject(ctx.metadata, ctx.name, id, transformer);
  };
}

export function defineInject<T>(
  metadata: DecoratorMetadataObject,
  property: string | symbol,
  id: MaybeThunk<ServiceIdentifier<T>>,
  transformer?: (instance: T) => unknown,
) {
  getClassDefinitions<T>(metadata).injectProps.push({
    property,
    id,
    transformer,
  } as InjectProp<T>);
}
