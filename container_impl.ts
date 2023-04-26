import { Container } from "./container.ts";
import { ContainerFluent } from "./container_fluent.ts";
import { FrozenError } from "./error/frozen_error.ts";
import { UndefinedError } from "./error/undefined_error.ts";
import { all, chain } from "./maybe_promise.ts";
import { Module } from "./module.ts";
import { Provider } from "./provider.ts";
import { ProviderDescriptor } from "./provider_descriptor.ts";
import { resolveSingleton } from "./resolve/resolve_singleton.ts";
import { resolveTransient } from "./resolve/resolve_transient.ts";
import { injectProperties } from "./resolve/utils.ts";
import { ServiceIdentifier } from "./service_identifier.ts";
import { ConstructType, Lifetime, MaybePromise } from "./types.ts";

export class ContainerImpl extends Container {
  _parent?: ContainerImpl;
  _modules = new Set<Module>();

  // deno-lint-ignore no-explicit-any
  _providers = new Map<ServiceIdentifier<any>, Provider<any>>();
  // deno-lint-ignore no-explicit-any
  _values = new Map<ServiceIdentifier<any>, any>();
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
    const provider: Provider<T> = {
      resolver: () => value,
      lifetime: Lifetime.Singleton,
      afterHandlers: [],
    };
    this._providers.set(id, provider);
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

  create<T>(Ctor: ConstructType<T>): MaybePromise<T> {
    return injectProperties<T>(new Ctor(), this);
  }

  resolve<T>(id: ServiceIdentifier<T>): MaybePromise<T> {
    const aliasStack: ServiceIdentifier<unknown>[] = [];
    let aliasId: ServiceIdentifier<unknown> | undefined = id;
    while ((aliasId = this._aliases.get(id))) {
      aliasStack.push(id);
      id = aliasId as ServiceIdentifier<T>;
    }
    const provider = this._providers.get(id);
    if (!provider) {
      throw new UndefinedError(id, aliasStack);
    }
    try {
      if (provider.lifetime === Lifetime.Singleton) {
        let root = this._parent ?? this;
        while (root._parent) {
          root = root._parent;
        }
        return resolveSingleton(root, provider);
      }
      if (provider.lifetime === Lifetime.Scoped) {
        return resolveSingleton(this, provider);
      }
      return resolveTransient(this, provider);
    } catch (e) {
      if (e instanceof UndefinedError) {
        throw new UndefinedError(id, aliasStack, e.resolveStack);
      } else {
        throw e;
      }
    }
  }

  get<T>(id: ServiceIdentifier<T>): T {
    const value = this._values.get(id);
    if (value) {
      return value;
    }
    throw new UndefinedError(id);
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
          [...this._providers.entries()].map(([id, provider]) => {
            if (provider.lifetime === Lifetime.Singleton) {
              let root = this._parent ?? this;
              while (root._parent) {
                root = root._parent;
              }
              return chain(resolveSingleton(root, provider)).next((value) => {
                this._values.set(id, value);
              }).value();
            }
            if (provider.lifetime === Lifetime.Scoped) {
              try {
                const resolved = resolveSingleton(this, provider);
                if (resolved instanceof Promise) {
                  return resolved.then((value) => {
                    this._values.set(id, value);
                  }).catch(() => {
                    // ignore
                  });
                } else {
                  this._values.set(id, resolved);
                }
              } catch {
                // ignore
              }
            }
          }),
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
      .next(() => {
        this._values.clear();
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
      container._parent = this;
      container._providers = new Map(this._providers.entries());
      this._scopes.set(target, container);
    }
    return this._scopes.get(target)!;
  }
}
