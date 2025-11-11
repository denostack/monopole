import type { Container } from "./container.ts";

/** @internal */
export interface ContainerState {
  ref: number;
}

const containerStateMap = new WeakMap<Container, ContainerState>();

/** @internal */
export function getContainerState(container: Container): ContainerState {
  let state = containerStateMap.get(container);
  if (!state) {
    state = { ref: 0 };
    containerStateMap.set(container, state);
  }
  return state;
}
