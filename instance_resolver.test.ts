import {
  assertEquals,
  assertInstanceOf,
  assertNotStrictEquals,
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

Deno.test("InstanceResolver, sync after with sync resolver", () => {
  const resolver = new InstanceResolver(() => ({ message: "hello world" }))
    .after((value) => {
      value.message = `(${value.message})`;
    });

  assertEquals(resolver.resolve(), { message: "(hello world)" });
  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
});

Deno.test("InstanceResolver, sync after with async resolver", async () => {
  const resolver = new InstanceResolver(() =>
    asyncValue({ message: "hello world!" })
  ).after((value) => {
    value.message = `(${value.message})`;
  });

  const resolved = resolver.resolve();
  assertInstanceOf(resolved, Promise);
  assertEquals(await resolved, { message: "(hello world!)" });

  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
  assertNotStrictEquals(await resolver.resolve(), await resolver.resolve());
});

Deno.test("InstanceResolver, async after with sync resolver", async () => {
  const resolver = new InstanceResolver(() => ({ message: "hello world!" }))
    .after(asyncHandler((value) => {
      value.message = `(${value.message})`;
    }));

  const resolved = resolver.resolve();
  assertInstanceOf(resolved, Promise);
  assertEquals(await resolved, { message: "(hello world!)" });

  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
  assertNotStrictEquals(await resolver.resolve(), await resolver.resolve());
});

Deno.test("InstanceResolver, async after with async resolver", async () => {
  const resolver = new InstanceResolver(() =>
    asyncValue({ message: "hello world!" })
  ).after(asyncHandler((value) => {
    value.message = `(${value.message})`;
  }));

  const resolved = resolver.resolve();
  assertInstanceOf(resolved, Promise);
  assertEquals(await resolved, { message: "(hello world!)" });

  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
  assertNotStrictEquals(await resolver.resolve(), await resolver.resolve());
});
