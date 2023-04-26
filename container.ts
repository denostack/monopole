import { ContainerFluent } from "./container_fluent.ts";

import { Module, ModuleDescriptor } from "./module.ts";
import { ServiceIdentifier } from "./service_identifier.ts";
import { ConstructType, MaybePromise, Resolver } from "./types.ts";

export abstract class Container implements ModuleDescriptor {
  abstract value<T>(
    id: ServiceIdentifier<T>,
    value: MaybePromise<T>,
  ): void;

  abstract resolver<T>(
    id: ServiceIdentifier<T>,
    resolver: Resolver<T>,
  ): ContainerFluent<T>;
  abstract bind<T>(constructor: ConstructType<T>): ContainerFluent<T>;
  abstract bind<T>(
    id: ServiceIdentifier<T>,
    constructor: ConstructType<T>,
  ): ContainerFluent<T>;

  abstract alias<T>(
    id: ServiceIdentifier<T>,
    target: ServiceIdentifier<T>,
  ): void;
  abstract resolve<T>(id: ServiceIdentifier<T>): MaybePromise<T>;

  abstract create<T>(ctor: ConstructType<T>): MaybePromise<T>;
  abstract has<T>(id: ServiceIdentifier<T>): boolean;

  abstract get<T>(id: ServiceIdentifier<T>): T;

  abstract register(module: Module): void;
  abstract boot(): MaybePromise<void>;
  abstract close(): MaybePromise<void>;

  // deno-lint-ignore ban-types
  abstract scope(target?: object): Container;
}
