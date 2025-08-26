// deno-lint-ignore-file no-explicit-any

import type {
  ConstructType,
  MaybePromise,
  ServiceIdentifier,
} from "../types.ts";

export type Provider<T = any> =
  | ConstructType<T>
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>;

export interface ClassProvider<T = any> {
  id: ServiceIdentifier<T>;
  useClass: ConstructType<T>;
  inject?: never;
}

export interface ValueProvider<T = any> {
  id: ServiceIdentifier<T>;
  useValue: MaybePromise<T>;
  inject?: never;
}

export interface FactoryProvider<T = any> {
  id: ServiceIdentifier<T>;
  useFactory: (...args: any[]) => MaybePromise<T>;
  inject?: (ServiceIdentifier | [
    id: ServiceIdentifier,
    optional?: boolean,
  ])[];
}

export interface ExistingProvider<T = any> {
  id: ServiceIdentifier<T>;
  useExisting: ServiceIdentifier<T>;
}
