import { Container } from "./container.ts";
import { UndefinedError } from "./error/undefined_error.ts";
import { FrozenError } from "./error/frozen_error.ts";
import { InstanceResolver } from "./instance_resolver.ts";
import { all, chain, MaybePromise } from "./maybe_promise.ts";
import { metadata, MetadataInjectProp } from "./metadata.ts";
import { Module } from "./module.ts";
import { ServiceIdentifier } from "./service_identifier.ts";
import { ConstructType } from "./types.ts";
import { ContainerFluent } from "./container_fluent.ts";

export class ContainerImpl extends Container {
  _modules = new Set<Module>();

  // deno-lint-ignore no-explicit-any
  _resolvers = new Map<ServiceIdentifier<any>, InstanceResolver<any>>();
  // deno-lint-ignore no-explicit-any
  _aliases = new Map<ServiceIdentifier<any>, ServiceIdentifier<any>>();

  // deno-lint-ignore ban-types
  _scopes = new WeakMap<object, ContainerImpl>();

  _booted = false;
  _booting?: MaybePromise<void>; // booting promise (promise lock)
  _closing?: MaybePromise<void>; // closing promise (promise lock)

  constructor() {
    super();
    this.value(Container, this);
    this.value("@", this);
  }

  value<T>(
    id: ServiceIdentifier<T>,
    value: MaybePromise<T>,
  ): void {
    this.delete(id);
    const resolver = new InstanceResolver(() => value);
    this._resolvers.set(id, resolver);
  }

  resolver<T>(
    id: ServiceIdentifier<T>,
    resolveHandler: () => MaybePromise<T>,
  ): ContainerFluent<T> {
    this.delete(id);
    const resolver = new InstanceResolver(resolveHandler);
    this._resolvers.set(id, resolver);
    return resolver;
  }

  bind<T>(constructor: ConstructType<T>): ContainerFluent<T>;
  bind<T>(
    id: ServiceIdentifier<T>,
    constructor: ConstructType<T>,
  ): ContainerFluent<T>;
  bind<T>(
    id: ConstructType<T> | ServiceIdentifier<T>,
    constructor?: ConstructType<T>,
  ): ContainerFluent<T> {
    this.delete(id);
    const Ctor = constructor ?? id as ConstructType<T>;
    const resolver = new InstanceResolver(() => {
      return new Ctor();
    });
    resolver.after((value) => {
      return this._injectProperties(
        value,
        metadata.inject.get(Ctor) ?? [],
      );
    });
    this._resolvers.set(id, resolver);
    return resolver;
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
      aliasStack.push(id);
      id = aliasId as ServiceIdentifier<T>;
    }

    try {
      let resolver: InstanceResolver<unknown> | undefined;
      if ((resolver = this._resolvers.get(id))) {
        return resolver.resolve(this) as MaybePromise<T>;
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

  get<T>(id: ServiceIdentifier<T>): T {
    const resolver = this._resolvers.get(id);
    if (resolver?.resolved) {
      return resolver.resolved as T;
    }
    throw new UndefinedError(id, []);
  }

  has<T>(id: ServiceIdentifier<T>): boolean {
    let aliasId: ServiceIdentifier<unknown> | undefined = id;
    while ((aliasId = this._aliases.get(id))) {
      id = aliasId as ServiceIdentifier<T>;
    }
    return this._resolvers.has(id);
  }

  register(module: Module) {
    this._modules.add(module);
  }

  delete(id: ServiceIdentifier<unknown>): void {
    const resolver = this._resolvers.get(id);
    if (resolver?.resolved || resolver?.resolvedPromise) {
      throw new FrozenError(id);
    }
    this._resolvers.delete(id);
    this._aliases.delete(id);
  }

  boot(): MaybePromise<void> {
    if (this._booted) {
      return;
    }
    if (this._booting) {
      return this._booting;
    }

    const modules = [...this._modules];

    modules.forEach((m) => m.configure?.(this));

    this._booting = all(modules.map((m) => m.boot?.(this)))
      .next(() =>
        all(
          [...this._resolvers.values()].map((value) => value.resolve(this)),
        ).value()
      )
      .next(() => {
        this._booted = true;
      })
      .value();

    return this._booting;
  }

  close(): MaybePromise<void> {
    if (!this._booted) {
      return;
    }
    if (this._closing) {
      return this._closing;
    }

    const modules = [...this._modules];

    this._closing = chain(this._booting)
      .next(() => all(modules.map((m) => m.close?.(this))))
      .next(() => [...this._resolvers.values()].map((value) => value.reset()))
      .next(() => {
        delete this._closing;
        delete this._booting;
        this._booted = false;
      })
      .value();

    return this._closing;
  }

  // deno-lint-ignore ban-types
  scope(target: object = {}): Container {
    if (!this._scopes.has(target)) {
      const container = new ContainerImpl();
      container._resolvers = new Map(this._resolvers.entries());
      this._scopes.set(target, container);
    }
    return this._scopes.get(target)!;
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
