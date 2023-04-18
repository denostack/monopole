import { ServiceIdentifier } from "./service_identifier.ts";
import { ConstructType, MaybePromise } from "./types.ts";

export interface Container {
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
}
