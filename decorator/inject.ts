import { Name } from "../interface.ts";
import { metadata } from "../metadata.ts";

export interface InjectOptions<T> {
  transformer?: (instance: T) => any;
}

export function Inject<T>(name: Name<T>): PropertyDecorator;
export function Inject<T>(
  name: Name<T>,
  transformer: (instance: T) => any,
): PropertyDecorator;
export function Inject<T>(
  name: Name<T>,
  options: InjectOptions<T>,
): PropertyDecorator;
export function Inject<T>(
  name: Name<T>,
  trasformerOrOptions?: ((instance: T) => any) | InjectOptions<T>,
) {
  let resolver: ((instance: T) => any) | null = null;
  if (typeof trasformerOrOptions === "function") {
    resolver = trasformerOrOptions;
  } else if (typeof trasformerOrOptions === "object") {
    resolver = trasformerOrOptions.transformer ?? null;
  }
  const metaInject = metadata.inject;

  return (target: any, property: string | symbol) => {
    target = (property ? target.constructor : target);
    let injectProps = metaInject.get(target);
    if (!injectProps) {
      injectProps = [];
      metaInject.set(target, injectProps);
    }

    injectProps.push({
      target,
      property,
      name,
      resolver,
    });
  };
}
