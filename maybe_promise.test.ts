import { assertEquals, assertInstanceOf } from "testing/asserts.ts";
import { chain } from "./maybe_promise.ts";

function asyncValue<T>(value: T, ms = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

Deno.test("MaybePromise, sync sync", () => {
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

Deno.test("MaybePromise, async sync", async () => {
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

Deno.test("MaybePromise, async sync", async () => {
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

Deno.test("MaybePromise, sync async", async () => {
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
