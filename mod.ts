import { Container } from "./container.ts";
import { ContainerImpl } from "./container_impl.ts";

export * from "./types.ts";
export * from "./service_identifier.ts";

export * from "./decorator/inject.ts";
export * from "./container.ts";
export * from "./container_impl.ts";
export * from "./module.ts";

export * from "./error/undefined_error.ts";
export * from "./error/frozen_error.ts";

export function createContainer(): Container {
  return new ContainerImpl();
}
