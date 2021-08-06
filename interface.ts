
export type ConstructType<T> = new (...args: any[]) => T
export type MaybePromise<T> = T | Promise<T>

export type Name<T> = ConstructType<T> | string | symbol

export interface ContainerFluent {
  // assign(string $paramName, $target): ContainerFluent
  // assignMany(array $params = []): ContainerFluent
  // wire(string $propertyName, $target): ContainerFluent
  // wireMany(array $properties): ContainerFluent
  // factory(): ContainerFluent
  freeze(): ContainerFluent
}
