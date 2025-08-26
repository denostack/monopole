import { assertEquals, assertInstanceOf } from "@std/assert";
import { all, chain } from "./maybe_promise.ts";

function asyncValue<T>(value: T, ms = 100): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

Deno.test("should chain synchronous operations", () => {
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

Deno.test("should chain async operations", async () => {
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

Deno.test("should chain mixed async and sync operations", async () => {
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

Deno.test("should chain sync followed by async operations", async () => {
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

Deno.test("should resolve all synchronous values", () => {
  assertEquals(all([]).value(), []);
  assertEquals(all(["1"]).value(), ["1"]);
  assertEquals(all(["1", "2"]).value(), ["1", "2"]);
});

Deno.test("should resolve mixed sync and async values", async () => {
  const values = all(["1", asyncValue("2")]).value();

  assertInstanceOf(values, Promise);
  assertEquals(await values, ["1", "2"]);
});

Deno.test("should resolve all asynchronous values", async () => {
  const values = all([asyncValue("1"), asyncValue("2")]).value();

  assertInstanceOf(values, Promise);
  assertEquals(await values, ["1", "2"]);
});
