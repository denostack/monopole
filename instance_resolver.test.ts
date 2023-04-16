import {
  assertEquals,
  assertInstanceOf,
  assertNotStrictEquals,
} from "testing/asserts.ts";
import { InstanceResolver } from "./instance_resolver.ts";

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.test("InstanceResolver, simple resolver", () => {
  const resolver = new InstanceResolver(() => "hello world");

  assertEquals(resolver.resolve(), "hello world");
});

Deno.test("InstanceResolver, object resolver", () => {
  const resolver = new InstanceResolver(() => ({ message: "hello world" }));

  assertEquals(resolver.resolve(), { message: "hello world" });
  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
});

Deno.test("InstanceResolver, promise resolver", async () => {
  const resolver = new InstanceResolver(() =>
    timeout(100).then(() => ({ message: "hello world!" }))
  );

  const resolved = resolver.resolve();
  assertInstanceOf(resolved, Promise);
  assertEquals(await resolved, { message: "hello world!" });

  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
  assertNotStrictEquals(await resolver.resolve(), await resolver.resolve());
});

Deno.test("InstanceResolver, after with object resolver", () => {
  const resolver = new InstanceResolver(() => ({ message: "hello world" }))
    .after((value) => {
      value.message = `(${value.message})`;
    });

  assertEquals(resolver.resolve(), { message: "(hello world)" });
  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
});

Deno.test("InstanceResolver, after with promise resolver", async () => {
  const resolver = new InstanceResolver(() =>
    timeout(100).then(() => ({ message: "hello world!" }))
  ).after((value) => {
    value.message = `(${value.message})`;
  });

  const resolved = resolver.resolve();
  assertInstanceOf(resolved, Promise);
  assertEquals(await resolved, { message: "(hello world!)" });

  assertNotStrictEquals(resolver.resolve(), resolver.resolve());
  assertNotStrictEquals(await resolver.resolve(), await resolver.resolve());
});
