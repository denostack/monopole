import { SYMBOL_ROOT_CONTAINER, SYMBOL_SCOPE } from "./constants.ts";
import { Container } from "./container.ts";
import type { ContainerFluent } from "./container_fluent.ts";
import { FrozenError } from "./error/frozen_error.ts";
import { UndefinedError } from "./error/undefined_error.ts";
import { promisify } from "./maybe_promise.ts";
import type { Module } from "./module.ts";
import type { Provider } from "./provider.ts";
import { ProviderDescriptor } from "./provider_descriptor.ts";
import { resolveSingleton } from "./resolve/resolve_singleton.ts";
import { resolveTransient } from "./resolve/resolve_transient.ts";
import { injectProperties } from "./resolve/utils.ts";
import type { ServiceIdentifier } from "./service_identifier.ts";
import { type ConstructType, Lifetime, type MaybePromise } from "./types.ts";

export class ContainerImpl extends Container {
  _root?: ContainerImpl; // only has root when this container is a child container
  _modules: Set<Module> = new Set();

  // deno-lint-ignore no-explicit-any
  _providers: Map<ServiceIdentifier<any>, Provider<any>> = new Map();
  // deno-lint-ignore no-explicit-any
  _values: Map<ServiceIdentifier<any>, any> = new Map();
  // deno-lint-ignore no-explicit-any
  _aliases: Map<ServiceIdentifier<any>, ServiceIdentifier<any>> = new Map();

  _scopes: WeakMap<object, Promise<Container>> = new WeakMap();

  _booted = false;
  _booting?: Promise<void>; // booting promise (promise lock)
  _closing?: Promise<void>; // closing promise (promise lock)

  constructor(root?: ContainerImpl) {
    super();
    this._root = root;
    this._values.set(Container, this);
    this._values.set(SYMBOL_ROOT_CONTAINER, root ?? this);
  }

  value<T>(
    id: ServiceIdentifier<T>,
    value: MaybePromise<T>,
  ): void {
    this.delete(id);
    if (value instanceof Promise) {
      this._providers.set(id, {
        resolver: () => value,
        lifetime: Lifetime.Singleton,
        afterHandlers: [],
      });
    } else {
      this._values.set(id, value);
    }
  }

  resolver<T>(
    id: ServiceIdentifier<T>,
    resolveHandler: () => MaybePromise<T>,
  ): ContainerFluent<T> {
    this.delete(id);
    const provider: Provider<T> = {
      resolver: resolveHandler,
      lifetime: Lifetime.Singleton,
      afterHandlers: [],
    };
    this._providers.set(id, provider);
    return new ProviderDescriptor(provider);
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
    const provider: Provider<T> = {
      resolver: () => new Ctor(),
      lifetime: Lifetime.Singleton,
      afterHandlers: [],
    };
    this._providers.set(id, provider);
    return new ProviderDescriptor(provider);
  }

  alias(
    id: ServiceIdentifier<unknown>,
    target: ServiceIdentifier<unknown>,
  ): this {
    this._aliases.set(id, target);
    return this;
  }

  create<T>(Ctor: ConstructType<T>): Promise<T> {
    return injectProperties<T>(new Ctor(), this);
  }

  resolve<T>(id: ServiceIdentifier<T>): Promise<T> {
    const aliasStack: ServiceIdentifier<unknown>[] = [];
    let aliasId: ServiceIdentifier<unknown> | undefined = id;
    while ((aliasId = this._aliases.get(id))) {
      aliasStack.push(id);
      id = aliasId as ServiceIdentifier<T>;
    }
    const value = this._values.get(id);
    if (value) {
      return Promise.resolve(value);
    }
    const provider = this._providers.get(id);
    if (!provider) {
      throw new UndefinedError(id, aliasStack);
    }
    try {
      return this._resolveProvider(provider);
    } catch (e) {
      if (e instanceof UndefinedError) {
        throw new UndefinedError(id, aliasStack, e.resolveStack);
      } else {
        throw e;
      }
    }
  }

  get<T>(id: ServiceIdentifier<T>): T {
    const aliasStack: ServiceIdentifier<unknown>[] = [];
    let aliasId: ServiceIdentifier<unknown> | undefined = id;
    while ((aliasId = this._aliases.get(id))) {
      aliasStack.push(id);
      id = aliasId as ServiceIdentifier<T>;
    }
    const value = this._values.get(id);
    if (value) {
      return value;
    }
    throw new UndefinedError(id, aliasStack);
  }

  has<T>(id: ServiceIdentifier<T>): boolean {
    let aliasId: ServiceIdentifier<unknown> | undefined = id;
    while ((aliasId = this._aliases.get(id))) {
      id = aliasId as ServiceIdentifier<T>;
    }
    return this._values.has(id) || this._providers.has(id);
  }

  register(module: Module) {
    this._modules.add(module);
  }

  delete(id: ServiceIdentifier<unknown>): void {
    if (this._values.has(id)) {
      throw new FrozenError(id);
    }
    this._providers.delete(id);
    this._aliases.delete(id);
  }

  boot(): Promise<void> {
    if (this._booted) {
      return Promise.resolve();
    }
    if (!this._booting) {
      this._booting = new Promise((resolve) => {
        const modules = [...this._modules];
        modules.forEach((m) => m.provide?.(this)); // provide is sync
        Promise.all(modules.map((m) => m.boot?.(this)))
          .then(() => {
            let providerEntries = [...this._providers.entries()];
            if (this._root) {
              // scoped container
              providerEntries = providerEntries.filter(([, provider]) =>
                provider.lifetime === Lifetime.Singleton ||
                provider.lifetime === Lifetime.Scoped
              );
            } else {
              // root container
              providerEntries = providerEntries.filter(([, provider]) =>
                provider.lifetime === Lifetime.Singleton
              );
            }
            return Promise.all(
              providerEntries.map(([id, provider]) =>
                this._resolveProvider(provider).then(
                  (v) => this._values.set(id, v),
                )
              ),
            );
          })
          .then(() => {
            this._booted = true;
            resolve();
          });
      });
    }

    return this._booting;
  }

  close(): Promise<void> {
    if (!this._booted) {
      return Promise.resolve();
    }
    if (!this._closing) {
      const modules = [...this._modules];

      this._closing = new Promise((resolve) => {
        (this._booting ?? Promise.resolve())
          .then(() => Promise.all(modules.map((m) => m.close?.(this))))
          .then(() => {
            this._values.clear();
            delete this._closing;
            delete this._booting;
            this._booted = false;
            resolve();
          });
      });
    }

    return this._closing;
  }

  scope(target: object = {}): Promise<Container> {
    if (!this._scopes.has(target)) {
      this._scopes.set(
        target,
        new Promise<Container>((resolve) => {
          const container = new ContainerImpl(this._root ?? this);
          container._providers = new Map(this._providers.entries());
          container._aliases = new Map(this._aliases.entries());
          container.value(SYMBOL_SCOPE, target);
          container.boot().then(() => {
            resolve(container);
          });
        }),
      );
    }
    return this._scopes.get(target)!;
  }

  _resolveProvider<T>(provider: Provider<T>): Promise<T> {
    if (provider.lifetime === Lifetime.Transient) {
      return resolveTransient(this, provider);
    }
    const baseContainer = provider.lifetime === Lifetime.Singleton && this._root
      ? this._root
      : this;
    return promisify(resolveSingleton(baseContainer, provider));
  }
}
