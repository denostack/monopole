import { assertEquals, assertInstanceOf } from "@std/assert";
import { all, chain } from "./maybe_promise.ts";

function asyncValue<T>(value: T, ms = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

Deno.test("MaybePromise - chain, sync sync", () => {
  const value = chain("")
    .next((value) => {
      return value + "1";
    })
    .next((value) => {
      return value + "2";
    })
    .value();

  assertEquals(value, "12");
});

Deno.test("MaybePromise - chain, async sync", async () => {
  const value = chain("")
    .next((value) => {
      return asyncValue(value + "1");
    })
    .next((value) => {
      return asyncValue(value + "2");
    })
    .value();

  assertInstanceOf(value, Promise);
  assertEquals(await value, "12");
});

Deno.test("MaybePromise - chain, async sync", async () => {
  const value = chain("")
    .next((value) => {
      return asyncValue(value + "1");
    })
    .next((value) => {
      return value + "2";
    })
    .value();

  assertInstanceOf(value, Promise);
  assertEquals(await value, "12");
});

Deno.test("MaybePromise - chain, sync async", async () => {
  const value = chain("")
    .next((value) => {
      return value + "1";
    })
    .next((value) => {
      return asyncValue(value + "2");
    })
    .value();

  assertInstanceOf(value, Promise);
  assertEquals(await value, "12");
});

Deno.test("MaybePromise - all, sync", () => {
  assertEquals(all([]).value(), []);
  assertEquals(all(["1"]).value(), ["1"]);
  assertEquals(all(["1", "2"]).value(), ["1", "2"]);
});

Deno.test("MaybePromise - all, sync async mixed", async () => {
  const values = all(["1", asyncValue("2")]).value();

  assertInstanceOf(values, Promise);
  assertEquals(await values, ["1", "2"]);
});

Deno.test("MaybePromise - all, async", async () => {
  const values = all([asyncValue("1"), asyncValue("2")]).value();

  assertInstanceOf(values, Promise);
  assertEquals(await values, ["1", "2"]);
});
