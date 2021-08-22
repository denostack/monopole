export type Name<T> = ConstructType<T> | string | symbol;

export type ConstructType<T> = ({ new (): T; readonly prototype: T });
export type MaybePromise<T> = T | Promise<T>;

export interface ProviderDescriptor {
  instance<T>(name: Name<T>, value: T): this;
  resolver<T>(name: Name<T>, resolver: () => T): this;
  bind<T>(constructor: ConstructType<T>): this;
  bind<T>(name: Name<T>, constructor: ConstructType<T>): this;

  alias(name: Name<any>, target: Name<any>): this;

  create<T>(ctor: ConstructType<T>): T;
  get<T>(name: Name<T>): T;
  has<T>(name: Name<T>): boolean;
}

export interface Provider {
  register(app: ProviderDescriptor): void;
  boot?(app: ProviderDescriptor): MaybePromise<void>;
  close?(app: ProviderDescriptor): MaybePromise<void>;
}
