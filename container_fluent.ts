export interface ContainerFluent<T> {
  after(handler: (instance: T) => void): this;
}
