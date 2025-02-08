import type { AfterResolveHandler, Lifetime, Resolver } from "./types.ts";

/** @internal */
export interface Provider<T> {
  resolver: Resolver<T>;
  lifetime: Lifetime;
  afterHandlers: AfterResolveHandler<T>[];
}
