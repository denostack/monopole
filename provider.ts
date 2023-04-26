import { AfterResolveHandler, Lifetime, Resolver } from "./types.ts";

export interface Provider<T> {
  resolver: Resolver<T>;
  lifetime: Lifetime;
  afterHandlers: AfterResolveHandler<T>[];
}
