import { Container } from "../container.ts";
import { promisify } from "../maybe_promise.ts";
import { Provider } from "../provider.ts";
import { afterResolve, injectProperties } from "./utils.ts";

export function resolveTransient<T>(
  container: Container,
  provider: Provider<T>,
): Promise<T> {
  return promisify(provider.resolver())
    .then((value) => injectProperties(value, container))
    .then((value) => afterResolve<T>(value, provider.afterHandlers));
}
