import { metadata, MetadataInjectProp } from "../metadata.ts";
import { ServiceIdentifier } from "../service_identifier.ts";
import { ConstructType } from "../types.ts";

// TODO Ecma Proposal Decorators
export function Inject<T>(
  id: ServiceIdentifier<T>,
  transformer?: (instance: T) => unknown,
): PropertyDecorator {
  // deno-lint-ignore ban-types
  return (target: Object, property: string | symbol) => {
    defineInject(
      target.constructor as ConstructType<T>,
      property as keyof T,
      id,
      transformer,
    );
  };
}

export function defineInject<T>(
  target: ConstructType<T>,
  property: keyof T,
  id: ServiceIdentifier<T>,
  transformer?: (instance: T) => unknown,
) {
  const metaInject = metadata.inject;
  let injectProps = metaInject.get(target);
  if (!injectProps) {
    injectProps = [];
    metaInject.set(target, injectProps);
  }
  injectProps.push({
    target,
    property,
    id,
    transformer,
  } as MetadataInjectProp<unknown>);
}
