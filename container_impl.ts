import { Container } from "./container.ts";
import { UndefinedError } from "./error/undefined_error.ts";
import { InstanceResolver } from "./instance_resolver.ts";
import { all, chain } from "./maybe_promise.ts";
import { metadata, MetadataInjectProp } from "./metadata.ts";
import { ServiceIdentifier } from "./service_identifier.ts";
import { ConstructType, MaybePromise } from "./types.ts";

export class ContainerImpl implements Container {
  // deno-lint-ignore no-explicit-any
  _resolvers = new Map<ServiceIdentifier<any>, InstanceResolver<any>>();
  // deno-lint-ignore no-explicit-any
  _aliases = new Map<ServiceIdentifier<any>, ServiceIdentifier<any>>();

  value<T>(
    id: ServiceIdentifier<T>,
    value: MaybePromise<T>,
  ): void {
    const resolver = new InstanceResolver(() => value);
    resolver.singleton = true;
    this._resolvers.set(id, resolver);
  }

  resolver<T>(
    id: ServiceIdentifier<T>,
    resolveHandler: () => MaybePromise<T>,
  ): void {
    const resolver = new InstanceResolver(resolveHandler);
    resolver.singleton = true;
    this._resolvers.set(id, resolver);
  }

  bind<T>(constructor: ConstructType<T>): void;
  bind<T>(
    id: ServiceIdentifier<T>,
    constructor: ConstructType<T>,
  ): void;
  bind<T>(
    id: ConstructType<T> | ServiceIdentifier<T>,
    constructor?: ConstructType<T>,
  ): void {
    const Ctor = constructor ?? id as ConstructType<T>;
    const resolver = new InstanceResolver(() => {
      return new Ctor();
    });
    resolver.singleton = true;
    resolver.after((value) => {
      return this._injectProperties(
        value,
        metadata.inject.get(Ctor) ?? [],
      );
    });
    this._resolvers.set(id, resolver);
  }

  alias(
    id: ServiceIdentifier<unknown>,
    target: ServiceIdentifier<unknown>,
  ): this {
    this._aliases.set(id, target);
    return this;
  }

  create<T>(Ctor: ConstructType<T>): MaybePromise<T> {
    const value = new Ctor();
    return chain(this._injectProperties<T>(
      value,
      (metadata.inject.get(Ctor) ?? []) as MetadataInjectProp<T>[],
    ))
      .next(() => value)
      .value();
  }

  resolve<T>(id: ServiceIdentifier<T>): MaybePromise<T> {
    const aliasStack: ServiceIdentifier<unknown>[] = [];
    let aliasId: ServiceIdentifier<unknown> | undefined = id;
    while ((aliasId = this._aliases.get(id))) {
      aliasStack.push(aliasId);
      id = aliasId as ServiceIdentifier<T>;
    }

    try {
      let resolver: InstanceResolver<unknown> | undefined;
      if ((resolver = this._resolvers.get(id))) {
        return resolver.resolve() as MaybePromise<T>;
      }
    } catch (e) {
      if (e instanceof UndefinedError) {
        throw new UndefinedError(id, aliasStack, e.resolveStack);
      } else {
        throw e;
      }
    }

    throw new UndefinedError(id, aliasStack);
  }

  has<T>(id: ServiceIdentifier<T>): boolean {
    let aliasId: ServiceIdentifier<unknown> | undefined = id;
    while ((aliasId = this._aliases.get(id))) {
      id = aliasId as ServiceIdentifier<T>;
    }
    return this._resolvers.has(id);
  }

  _injectProperties<T>(
    value: T,
    properties: MetadataInjectProp<T>[],
  ): MaybePromise<void> {
    return all(properties.map(({ id, property, transformer }) => {
      return chain(this.resolve(id)).next((resolved) => {
        return {
          property,
          dependency: (transformer?.(resolved) ?? resolved) as T[keyof T],
        };
      }).value();
    })).next((deps) => {
      for (const { property, dependency } of deps) {
        value[property] = dependency;
      }
    }).value();
  }
}
