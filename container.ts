import { MaybePromise } from "./maybe_promise.ts";
import { Module, ModuleDescriptor } from "./module.ts";
import { ServiceIdentifier } from "./service_identifier.ts";
import { ConstructType } from "./types.ts";

export interface Container extends ModuleDescriptor {
  value<T>(
    id: ServiceIdentifier<T>,
    value: MaybePromise<T>,
  ): void;
  resolver<T>(
    id: ServiceIdentifier<T>,
    resolver: () => MaybePromise<T>,
  ): void;
  bind<T>(constructor: ConstructType<T>): void;
  bind<T>(
    id: ServiceIdentifier<T>,
    constructor: ConstructType<T>,
  ): void;

  alias<T>(id: ServiceIdentifier<T>, target: ServiceIdentifier<T>): void;
  resolve<T>(id: ServiceIdentifier<T>): MaybePromise<T>;

  create<T>(ctor: ConstructType<T>): MaybePromise<T>;
  has<T>(id: ServiceIdentifier<T>): boolean;

  get<T>(id: ServiceIdentifier<T>): T;

  register(module: Module): void;
  boot(): MaybePromise<void>;
  close(): MaybePromise<void>;
}
