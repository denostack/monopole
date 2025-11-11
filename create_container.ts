import type { Container } from "./container.ts";
import { ContainerContext } from "./container_context.ts";
import { getContainerState } from "./container_state.ts";
import type { Module } from "./module.ts";
import type { MaybePromise, ServiceIdentifier } from "./types.ts";
import { createResolveService } from "./utils/create_resolve_service.ts";

export function createContainer(module: Module): Promise<Container> {
  return createContainerContext(
    module,
    new WeakMap<Module, Promise<ContainerContext>>(),
  );
}

function createContainerContext(
  module: Module,
  containerStorage: WeakMap<Module, Promise<ContainerContext>>,
): Promise<ContainerContext> {
  let containerPromise = containerStorage.get(module);
  if (!containerPromise) {
    containerPromise = (async () => {
      const importedContainerStates = await Promise.all(
        (module.imports ?? []).map((m) =>
          createContainerContext(m, containerStorage).then((container) => ({
            container,
            state: getContainerState(container),
          }))
        ),
      );
      const importedValues = new Map(
        importedContainerStates.reduce((carry, { container }) => [
          ...carry,
          ...container.entries(),
        ], [] as [ServiceIdentifier, unknown][]),
      );
      const resolvers = new Map<
        ServiceIdentifier,
        () => MaybePromise<unknown>
      >();
      const resolvedValues = new Map<ServiceIdentifier, unknown>();

      const resolveService = createResolveService({
        resolvers,
        resolvedValues,
        importedValues,
      });

      for (const provider of module.providers ?? []) {
        if ("useClass" in provider) {
          const Ctor = provider.useClass;
          resolvers.set(provider.id, () => new Ctor());
        } else if ("useValue" in provider) {
          if (provider.useValue instanceof Promise) {
            resolvers.set(provider.id, () => provider.useValue);
          } else {
            resolvedValues.set(provider.id, provider.useValue);
          }
        } else if ("useFactory" in provider) {
          const deps = provider.inject ?? [];
          resolvers.set(provider.id, async () => {
            const resolved = await Promise.all(
              deps.map((dep) =>
                Array.isArray(dep) ? dep : [dep, false] as const
              ).map(async ([dep, optional]) => {
                try {
                  return await resolveService(dep);
                } catch (e) {
                  if (optional) {
                    return null;
                  }
                  throw e;
                }
              }),
            );
            return provider.useFactory(...resolved);
          });
        } else if ("useExisting" in provider) {
          resolvers.set(
            provider.id,
            () => resolveService(provider.useExisting),
          );
        } else if (provider instanceof Function) {
          // same as useClass
          resolvers.set(provider, () => new provider());
        } else {
          throw new SyntaxError("unknown provider");
        }
      }

      await Promise.all([...resolvers.keys()].map((id) => resolveService(id)));
      const resolvedValueEntries = await Promise.all(
        [...resolvedValues.entries()].map(async ([id, value]) =>
          [id, await value] as const
        ),
      );

      const internalContext = new ContainerContext(
        new Map([
          ...importedValues,
          ...resolvedValueEntries,
        ]),
        () => {
          throw new Error("cannot call dispose");
        },
      );
      await module.boot?.(internalContext);

      const exportIdentifiers = new Set(module.exports ?? []);
      importedContainerStates.forEach(({ state }) => state.ref++);
      const container = new ContainerContext(
        new Map(
          [
            ...importedValues,
            ...resolvedValueEntries,
          ].filter(([id]) => exportIdentifiers.has(id)),
        ),
        () => {
          return Promise.resolve(module.dispose?.(internalContext)).then(
            () => {
              importedContainerStates.forEach(({ state }) => state.ref--);
              return Promise.all(
                importedContainerStates
                  .filter(({ state }) => state.ref === 0)
                  .map(({ container }) => container.dispose()),
              );
            },
          ).catch(() => {}).then(() => {});
        },
      );
      return container;
    })();
    containerStorage.set(module, containerPromise);
  }
  return containerPromise;
}
