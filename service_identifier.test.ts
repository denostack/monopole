import { assertEquals } from "@std/assert";

import { toString } from "./utils/service_identifier.ts";

Deno.test("ServiceIdentifier, toString", () => {
  assertEquals(toString("test"), '"test"');
  assertEquals(toString('t"est'), '"t\\"est"');
  assertEquals(toString(Symbol("hello")), "Symbol(hello)");
});

Deno.test("ServiceIdentifier, toString class / function", () => {
  class Test {}
  assertEquals(toString(Test), "[class Test]");
  assertEquals(toString(class {}), "[anonymous class]");

  function test() {}
  assertEquals(toString(test), "[function test]");
  assertEquals(toString(() => {}), "[anonymous function]");
});
