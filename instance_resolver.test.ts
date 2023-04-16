import {
  assertEquals,
  assertInstanceOf,
  assertNotInstanceOf,
  assertNotStrictEquals,
  assertStrictEquals,
} from "testing/asserts.ts";
import { InstanceResolver } from "./instance_resolver.ts";

function asyncValue<T>(value: T, ms = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function asyncHandler<TArg, TReturn>(
  handler: (arg: TArg) => TReturn,
  ms = 100,
): (arg: TArg) => Promise<TReturn> {
  return (arg: TArg) =>
    new Promise((resolve) => setTimeout(() => resolve(handler(arg)), ms));
}

Deno.test("InstanceResolver, sync resolver", () => {
  const resolver = new InstanceResolver(() => ({ message: "hello world" }));

  const value = resolver.resolve();
  assertEquals(value, { message: "hello world" });
  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
});

Deno.test("InstanceResolver, async resolver", async () => {
  const resolver = new InstanceResolver(() =>
    asyncValue({ message: "hello world!" })
  );

  const value = resolver.resolve();
  assertInstanceOf(value, Promise);
  assertEquals(await value, { message: "hello world!" });

  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
  assertNotStrictEquals(await resolver.resolve(), await resolver.resolve());
});

Deno.test("InstanceResolver, after only sync", () => {
  const resolver = new InstanceResolver(() => ({ message: "hello world" }))
    .after((value) => {
      value.message = `(${value.message})`;
    });

  assertEquals(resolver.resolve(), { message: "(hello world)" });
  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
});

Deno.test("InstanceResolver, after with async", async (t) => {
  const cases = [
    {
      name: "async + sync",
      resolver: new InstanceResolver(
        () => asyncValue({ message: "hello world!" }),
      ).after((value) => {
        value.message = `(${value.message})`;
      }),
    },
    {
      name: "sync + async",
      resolver: new InstanceResolver(() => ({ message: "hello world!" }))
        .after(asyncHandler((value) => {
          value.message = `(${value.message})`;
        })),
    },
    {
      name: "async + async",
      resolver: new InstanceResolver(
        () => asyncValue({ message: "hello world!" }),
      ).after(asyncHandler((value) => {
        value.message = `(${value.message})`;
      })),
    },
  ];

  await Promise.all(cases.map(async ({ name, resolver }) => {
    await t.step({
      name,
      fn: async () => {
        const value = resolver.resolve();
        assertInstanceOf(value, Promise);
        assertEquals(await value, { message: "(hello world!)" });

        assertNotStrictEquals(resolver.resolve(), resolver.resolve());
        assertEquals(await resolver.resolve(), await resolver.resolve());
        assertNotStrictEquals(
          await resolver.resolve(),
          await resolver.resolve(),
        );
      },
      sanitizeOps: false,
      sanitizeResources: false,
      sanitizeExit: false,
    });
  }));
});

Deno.test("InstanceResolver, singleton with sync", () => {
  const resolver = new InstanceResolver(() => ({ message: "hello world" }))
    .after((value) => {
      value.message = `(${value.message})`;
    });
  resolver.singleton = true;

  assertEquals(resolver.resolve(), { message: "(hello world)" });
  assertStrictEquals(resolver.resolve(), resolver.resolve());
});

Deno.test("InstanceResolver, singleton with async", async (t) => {
  const cases = [
    {
      name: "async + sync",
      resolver: new InstanceResolver(
        () => asyncValue({ message: "hello world!" }),
      ).after((value) => {
        value.message = `(${value.message})`;
      }),
    },
    {
      name: "sync + async",
      resolver: new InstanceResolver(() => ({ message: "hello world!" }))
        .after(asyncHandler((value) => {
          value.message = `(${value.message})`;
        })),
    },
    {
      name: "async + async",
      resolver: new InstanceResolver(
        () => asyncValue({ message: "hello world!" }),
      ).after(asyncHandler((value) => {
        value.message = `(${value.message})`;
      })),
    },
  ];

  await Promise.all(cases.map(async ({ name, resolver }) => {
    resolver.singleton = true;
    await t.step({
      name,
      fn: async () => {
        const valuePromise = resolver.resolve();

        assertInstanceOf(valuePromise, Promise);
        assertStrictEquals(resolver.resolve(), valuePromise);

        const value = await valuePromise;
        assertEquals(value, { message: "(hello world!)" });

        // first resolved value is cached.
        // so, second resolve is not promise.
        const secondValue = resolver.resolve();
        assertNotInstanceOf(secondValue, Promise);
        assertStrictEquals(secondValue, value);
      },
      sanitizeOps: false,
      sanitizeResources: false,
      sanitizeExit: false,
    });
  }));
});
