import { Name } from "./interface.ts";
import { metadata } from "./metadata.ts";

export interface InjectParams<T> {
  resolver?: (instance: T) => any;
}

export function Inject<T>(name: Name<T>): PropertyDecorator;
export function Inject<T>(
  name: Name<T>,
  immediatelyResolver: (instance: T) => any,
): PropertyDecorator;
export function Inject<T>(
  name: Name<T>,
  params: InjectParams<T>,
): PropertyDecorator;
export function Inject<T>(
  name: Name<T>,
  resolverOrParams?: ((instance: T) => any) | InjectParams<T>,
) {
  let resolver: ((instance: T) => any) | null = null;
  if (typeof resolverOrParams === "function") {
    resolver = resolverOrParams;
  } else if (typeof resolverOrParams === "object") {
    resolver = resolverOrParams.resolver ?? null;
  }
  const metaInejct = metadata.inject;

  return (target: any, property: string | symbol) => {
    target = (property ? target.constructor : target);
    let injectProps = metaInejct.get(target);
    if (!injectProps) {
      injectProps = [];
      metaInejct.set(target, injectProps);
    }

    injectProps.push({
      target,
      property,
      name,
      resolver,
    });
  };
}
