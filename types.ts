// deno-lint-ignore-file no-explicit-any

export type Constructor<T = object, A extends any[] = any[]> = new (...args: A) => T;
export type AbstractConstructor<T = object, A extends any[] = any[]> = abstract new (...args: A) => T;

export type MaybePromise<T> = T | Promise<T>;

export type Thunk<T> = () => T;
export type MaybeThunk<T> = T | Thunk<T>;

export type ServiceIdentifier<T = any> =
  | Constructor<T>
  | AbstractConstructor<T>
  | string
  | symbol;

export type Provider<T = any> =
  | Constructor<T>
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>;

export interface ClassProvider<T = any> {
  id: ServiceIdentifier<T>;
  useClass: Constructor<T>;
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
