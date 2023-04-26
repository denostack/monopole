import { Container } from "../container.ts";
import { chain } from "../maybe_promise.ts";
import { Provider } from "../provider.ts";
import { afterResolve, injectProperties } from "./utils.ts";

export function resolveTransient<T>(
  container: Container,
  provider: Provider<T>,
) {
  return chain(provider.resolver())
    .next((value) => injectProperties(value, container))
    .next((value) => afterResolve<T>(value, provider.afterHandlers))
    .value();
}
