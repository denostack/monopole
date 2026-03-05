import { inject } from "./inject.ts";

class Foo {
  foo = "foo";
}

class Bar {
  bar = "bar";
}

Deno.test("inject should accept matching type", () => {
  class _Target {
    @inject(Foo)
    a!: Foo;
  }
});

Deno.test("inject should reject mismatched type", () => {
  class _Target {
    // @ts-expect-error Type 'Foo' is not assignable to type 'Bar'
    @inject(Foo)
    a!: Bar;
  }
});

Deno.test("inject with transformer should accept transformer result type", () => {
  class _Target {
    @inject(Foo, (_foo: Foo) => new Bar())
    a!: Bar;
  }
});

Deno.test("inject with transformer should reject mismatched transformer result type", () => {
  class _Target {
    // @ts-expect-error Type 'Bar' is not assignable to type 'Foo'
    @inject(Foo, (_foo: Foo) => new Bar())
    a!: Foo;
  }
});
