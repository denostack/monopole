import { Container } from "./container.ts";
import { ContainerImpl } from "./container_impl.ts";

export function createContainer(): Container {
  return new ContainerImpl();
}
