// deno-lint-ignore-file no-explicit-any

export interface ConstructType<T> extends Function {
  new (...args: unknown[]): T;
}

export interface AbstractType<T> extends Function {
  readonly prototype: T;
}

export type MaybePromise<T> = T | Promise<T>;

export type Thunk<T> = () => T;
export type MaybeThunk<T> = T | Thunk<T>;

export type ServiceIdentifier<T = any> =
  | ConstructType<T>
  | AbstractType<T>
  | string
  | symbol;

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
