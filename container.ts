import {
  ConstructType,
  Name,
  Provider,
  ProviderDescriptor,
} from "./interface.ts";
import { metadata, MetadataInjectProp } from "./metadata.ts";
import { FrozenError, UndefinedError } from "./error.ts";

type ContainerType = "resolver" | "bind" | "instance";

export class Container implements ProviderDescriptor {
  _boot: Promise<void> | null;
  _close: Promise<void> | null;

  _defs: Map<any, ContainerType>;
  _instances: Map<any, any>;
  _resolvers: Map<any, () => any>;
  _binds: Map<any, ConstructType<any>>;

  _aliases: Map<any, any>;

  _freezes: Set<any>;

  _providers: Provider[];

  constructor() {
    this._boot = null;
    this._close = null;
    this._defs = new Map<any, ContainerType>([
      [Container, "instance"],
    ]);
    this._instances = new Map<any, any>([
      [Container, this],
    ]);
    this._resolvers = new Map<any, () => any>();
    this._binds = new Map<any, ConstructType<any>>();

    this._aliases = new Map<any, any>([
      ["container", Container],
    ]);

    this._freezes = new Set<any>(["container", Container]);

    this._providers = [];
  }

  instance<T>(name: Name<T>, value: T): this {
    this.delete(name);
    this._defs.set(name, "instance");
    this._instances.set(name, value);
    return this;
  }

  resolver<T>(name: Name<T>, resolver: () => T): this {
    this.delete(name);
    this._defs.set(name, "resolver");
    this._resolvers.set(name, resolver);
    return this;
  }

  bind<T>(constructor: ConstructType<T>): this;
  bind<T>(name: Name<T>, constructor: ConstructType<T>): this;
  bind<T>(
    name: ConstructType<T> | Name<T>,
    constructor?: ConstructType<T>,
  ): this {
    this.delete(name);
    this._defs.set(name, "bind");
    this._binds.set(name, constructor ?? name as ConstructType<T>);
    return this;
  }

  alias(name: Name<any>, target: Name<any>): this {
    this._aliases.set(name, target);
    return this;
  }

  create<T>(ctor: ConstructType<T>): T {
    const instance = new ctor();
    return this._inject(instance, metadata.inject.get(ctor) || []);
  }

  get<T>(name: Name<T>): T {
    const aliasNames = [];
    while (this._aliases.has(name)) {
      aliasNames.push(name);
      name = this._aliases.get(name);
    }

    try {
      let instance: any | undefined;
      if ((instance = this._instances.get(name))) {
        aliasNames.forEach((name) => this._freezes.add(name));
        this._freezes.add(name);
        return instance;
      }

      let resolver: (() => any) | undefined;
      if ((resolver = this._resolvers.get(name))) {
        const instance = resolver();
        this._instances.set(name, instance); // singleton
        aliasNames.forEach((name) => this._freezes.add(name));
        this._freezes.add(name);
        return instance;
      }

      let ctor: ConstructType<any> | undefined;
      if ((ctor = this._binds.get(name))) {
        const instance = new ctor();
        this._instances.set(name, instance);
        aliasNames.forEach((name) => this._freezes.add(name));
        this._freezes.add(name);
        return this._inject(instance, metadata.inject.get(ctor) || []);
      }
    } catch (e) {
      if (e instanceof UndefinedError) {
        throw new UndefinedError(name, aliasNames, e.resolveStack);
      } else {
        throw e;
      }
    }

    throw new UndefinedError(name, aliasNames);
  }

  has<T>(name: Name<T>): boolean {
    while (this._aliases.has(name)) {
      name = this._aliases.get(name);
    }
    return this._instances.has(name) ||
      this._resolvers.has(name) ||
      this._binds.has(name);
  }

  delete(...names: Name<any>[]): void {
    for (const name of names) {
      if (this._freezes.has(name)) {
        throw new FrozenError(name);
      }

      this._instances.delete(name);
      this._resolvers.delete(name);
      this._binds.delete(name);
      this._aliases.delete(name);
    }
  }

  register(provider: Provider): void {
    if (this._boot) {
      throw new Error("Cannot register a provider after booting.");
    }
    this._providers.push(provider);
  }

  boot(forced = false): Promise<void> {
    if (this._boot && !forced) {
      return this._boot;
    }

    this._boot = Promise.all(this._providers.map((p) => p.register(this)))
      .then(() =>
        Promise.all(
          this._providers.filter((p) => p.boot).map((p) => p.boot!(this)),
        )
      )
      .then(() =>
        Promise.all([...this._defs.keys()].map((name) => {
          // resolve promise value
          return Promise.resolve(this.get(name)).then((instance) =>
            this._instances.set(name, instance)
          );
        }))
      )
      .then(() => Promise.resolve());

    return this._boot;
  }

  close(): Promise<void> {
    if (this._close) {
      return this._close;
    }
    if (this._boot) {
      this._close = this._boot
        .then(() =>
          Promise.all(
            this._providers.filter((p) => p.close).map((p) => p.close!(this)),
          )
        )
        .then(() => {
          this._close = null;
          this._boot = null;
        });

      return this._close;
    }
    return Promise.resolve();
  }

  _inject<T>(instance: T, metaInjects: MetadataInjectProp[]): T {
    for (
      const { name, resolver, property } of metaInjects
    ) {
      const prop = this.get(name);
      (instance as any)[property] = resolver ? resolver(prop) : prop;
    }
    return instance;
  }
}

// default container
export const container = new Container();
