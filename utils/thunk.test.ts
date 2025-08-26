import { assertEquals } from "@std/assert";
import { isThunk } from "./thunk.ts";

Deno.test("Thunk - isThunk", () => {
  class Foo {}
  class AbstractFoo {}

  assertEquals(isThunk(() => Foo), true);
  assertEquals(isThunk(() => AbstractFoo), true);
  assertEquals(isThunk(Foo), false);
  assertEquals(isThunk(AbstractFoo), false);
});
