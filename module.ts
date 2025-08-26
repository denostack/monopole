import type { Container } from "./container.ts";
import type { Provider } from "./utils/provider.ts";
import type { MaybePromise, ServiceIdentifier } from "./types.ts";

export interface Module {
  imports?: Module[];
  providers?: Provider[];
  exports?: ServiceIdentifier[];

  boot?(container: Container): MaybePromise<void>;
  dispose?(container: Container): MaybePromise<void>;
}
