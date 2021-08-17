import {
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.92.0/testing/asserts.ts";

import { Container } from "./container.ts";
import { Inject } from "./decorator.ts";
import { FrozenError, UndefinedError } from "./error.ts";

function assertArrayEquals(actual: any[], expected: any[]) {
  assertEquals(actual.length, expected.length);
  actual.forEach((item, itemIndex) => {
    assertStrictEquals(item, expected[itemIndex]);
  });
}

Deno.test("predefined values", () => {
  const container = new Container();

  assertThrows(
    () => container.delete(Container),
    Error,
    "Container is already frozen.",
  );

  assertThrows(
    () => container.delete("container"),
    Error,
    '"container" is already frozen.',
  );

  assertStrictEquals(container.get(Container), container);
  assertStrictEquals(container.get("container"), container);
});

Deno.test("define instance", () => {
  const container = new Container();

  container.instance("obj1", { message: "this is obj1" });
  container.instance("obj2", { message: "this is obj2" });

  const result1 = container.get("obj1");
  const result2 = container.get("obj2");

  assertEquals(result1, { message: "this is obj1" });
  assertEquals(result2, { message: "this is obj2" });

  assertStrictEquals(container.get("obj1"), result1); // same instance
  assertStrictEquals(container.get("obj2"), result2); // same instance
});

Deno.test("define resolver", () => {
  const container = new Container();

  container.resolver("resolver1", () => ({ message: "this is resolver1" }));
  container.resolver("resolver2", () => ({ message: "this is resolver2" }));

  const result1 = container.get("resolver1");
  const result2 = container.get("resolver2");

  assertEquals(result1, { message: "this is resolver1" });
  assertEquals(result2, { message: "this is resolver2" });

  assertStrictEquals(container.get("resolver1"), result1); // same instance (singleton)
  assertStrictEquals(container.get("resolver2"), result2); // same instance (singleton)
});

Deno.test("define bind", () => {
  const container = new Container();

  class Driver1 {
  }

  class Driver2 {
  }

  container.bind("driver1", Driver1);
  container.bind(Driver2);

  const result1 = container.get<Driver1>("driver1");
  const result2 = container.get(Driver2);

  assertEquals(result1 instanceof Driver1, true);
  assertEquals(result2 instanceof Driver2, true);

  assertStrictEquals(container.get("driver1"), result1); // same instance (singleton)
  assertStrictEquals(container.get(Driver2), result2); // same instance (singleton)`
});

Deno.test("define alias", () => {
  const container = new Container();

  class Driver1 {
  }

  class Driver2 {
  }

  container.instance("instance", { message: "this is instance" });
  container.resolver("resolver", () => ({ message: "this is resolver" }));
  container.bind("driver1", Driver1);
  container.bind(Driver2);

  container.alias("alias1", "instance");
  container.alias("alias2", "resolver");
  container.alias("alias3", "driver1");
  container.alias("alias4", Driver2);

  const result1 = container.get("instance");
  const result2 = container.get("resolver");
  const result3 = container.get("driver1");
  const result4 = container.get(Driver2);

  assertStrictEquals(result1, container.get("alias1"));
  assertStrictEquals(result2, container.get("alias2"));
  assertStrictEquals(result3, container.get("alias3"));
  assertStrictEquals(result4, container.get("alias4"));
});

Deno.test("has", () => {
  const container = new Container();

  class Driver1 {
  }

  class Driver2 {
  }

  container.instance("instance", { message: "this is instance" });
  container.resolver("resolver", () => ({ message: "this is resolver" }));
  container.bind("driver1", Driver1);
  container.bind(Driver2);
  container.alias("alias1", "instance");

  assertEquals(container.has("instance"), true);
  assertEquals(container.has("resolver"), true);
  assertEquals(container.has("driver1"), true);
  assertEquals(container.has(Driver2), true);
  assertEquals(container.has("alias1"), true);

  assertEquals(container.has("unknown"), false);
});

Deno.test("delete", () => {
  const container = new Container();

  class Driver1 {
  }

  class Driver2 {
  }

  container.instance("instance", { message: "this is instance" });
  container.resolver("resolver", () => ({ message: "this is resolver" }));
  container.bind("driver1", Driver1);
  container.bind(Driver2);
  container.alias("alias1", "instance");

  assertEquals(container.has("instance"), true);
  assertEquals(container.has("resolver"), true);
  assertEquals(container.has("driver1"), true);
  assertEquals(container.has(Driver2), true);
  assertEquals(container.has("alias1"), true);

  container.delete("instance");
  container.delete("resolver");
  container.delete("driver1");
  container.delete(Driver2);
  container.delete("alias1");

  assertEquals(container.has("instance"), false);
  assertEquals(container.has("resolver"), false);
  assertEquals(container.has("driver1"), false);
  assertEquals(container.has(Driver2), false);
  assertEquals(container.has("alias1"), false);
});

Deno.test("freeze", () => {
  const container = new Container();

  class Driver1 {
  }

  class Driver2 {
  }

  container.instance("instance", { message: "this is instance" });
  container.resolver("resolver", () => ({ message: "this is resolver" }));
  container.bind("driver1", Driver1);
  container.bind(Driver2);
  container.alias("alias", "instance");

  assertEquals(container.has("instance"), true);
  assertEquals(container.has("resolver"), true);
  assertEquals(container.has("driver1"), true);
  assertEquals(container.has(Driver2), true);
  assertEquals(container.has("alias"), true);

  container.get("instance");
  container.get("resolver");
  container.get("driver1");
  container.get(Driver2);
  container.get("alias");

  const error1 = assertThrows(
    () => container.delete("instance"),
    FrozenError,
    '"instance" is already frozen.',
  ) as FrozenError;
  assertStrictEquals(error1.target, "instance");

  const error2 = assertThrows(
    () => container.delete("resolver"),
    FrozenError,
    '"resolver" is already frozen.',
  ) as FrozenError;
  assertStrictEquals(error2.target, "resolver");

  const error3 = assertThrows(
    () => container.delete("driver1"),
    FrozenError,
    '"driver1" is already frozen.',
  ) as FrozenError;
  assertStrictEquals(error3.target, "driver1");

  const error4 = assertThrows(
    () => container.delete(Driver2),
    FrozenError,
    "Driver2 is already frozen.",
  ) as FrozenError;
  assertStrictEquals(error4.target, Driver2);

  const error5 = assertThrows(
    () => container.delete("alias"),
    FrozenError,
    '"alias" is already frozen.',
  ) as FrozenError;
  assertStrictEquals(error5.target, "alias");
});

Deno.test("undefined error", () => {
  const container = new Container();

  assertThrows(
    () => container.get("undefined"),
    UndefinedError,
    '"undefined" is undefined!',
  );
});

Deno.test("decorator inject", () => {
  const container = new Container();

  class Driver {
  }

  class Connection {
    @Inject(Driver)
    driver!: Driver;
  }

  container.bind(Driver);
  container.bind(Connection);

  const driver = container.get(Driver);
  const connection = container.get(Connection);

  assertEquals(driver instanceof Driver, true);
  assertEquals(connection instanceof Connection, true);

  assertEquals(connection.driver instanceof Driver, true);
});

Deno.test("run create (factory)", () => {
  const container = new Container();

  class Connection {
  }

  class Controller {
    @Inject("connection")
    public connection!: Connection;
  }

  container.bind("connection", Connection);

  const controller = container.create(Controller);

  assertEquals(controller instanceof Controller, true);
  assertEquals(controller.connection instanceof Connection, true);

  assertNotStrictEquals(container.create(Controller), controller);
});

Deno.test("boot", () => {
  const container = new Container();

  let countCallRegister = 0;
  let countCallBoot = 0;

  container.register({
    register() {
      countCallRegister++;
    },
    boot() {
      countCallBoot++;
    },
  });

  container.boot();
  container.boot();
  container.boot();

  assertEquals(countCallRegister, 1);
  assertEquals(countCallBoot, 1);
});

Deno.test("boot force", () => {
  const container = new Container();

  let countCallRegister = 0;
  let countCallBoot = 0;

  container.register({
    register() {
      countCallRegister++;
    },
    boot() {
      countCallBoot++;
    },
  });

  container.boot();
  container.boot();
  container.boot();

  container.boot(true);

  assertEquals(countCallRegister, 2);
  assertEquals(countCallBoot, 2);
});

Deno.test("close", () => {
  const container = new Container();

  let countCallRegister = 0;
  let countCallBoot = 0;
  let countCallClose = 0;

  container.register({
    register() {
      countCallRegister++;
    },
    boot() {
      countCallBoot++;
    },
    close() {
      countCallClose++;
    },
  });

  container.boot();
  container.close(); // reset

  container.boot();

  assertEquals(countCallRegister, 2);
  assertEquals(countCallBoot, 2);
  assertEquals(countCallClose, 1);
});

Deno.test("resolve circular dependency bind", () => {
  const container = new Container();

  class A {
    @Inject("b")
    public b!: B;
  }

  class B {
    @Inject("a")
    public a!: A;
  }

  container.bind(A);
  container.bind(B);

  container.alias("a", A);
  container.alias("b", B);

  assertEquals(container.get(A) instanceof A, true);
  assertEquals(container.get(B) instanceof B, true);
});

Deno.test("undefined error", () => {
  const container = new Container();

  const name1 = "instance";
  const error1 = assertThrows(
    () => container.get(name1),
    UndefinedError,
    `"instance" is undefined!
resolve stack:
  [0] "instance"`,
  ) as UndefinedError;
  assertStrictEquals(error1.target, name1);
  assertArrayEquals(error1.resolveStack, [name1]);

  const name2 = Symbol("symbol");
  const error2 = assertThrows(
    () => container.get(name2),
    UndefinedError,
    `Symbol(symbol) is undefined!
resolve stack:
  [0] Symbol(symbol)`,
  ) as UndefinedError;
  assertStrictEquals(error2.target, name2);
  assertArrayEquals(error2.resolveStack, [name2]);

  class Something {}
  const name3 = Something;
  const error3 = assertThrows(
    () => container.get(name3),
    UndefinedError,
    `Something is undefined!
resolve stack:
  [0] Something`,
  ) as UndefinedError;
  assertStrictEquals(error3.target, name3);
  assertArrayEquals(error3.resolveStack, [name3]);

  const name4 = (() => class {})();
  const error4 = assertThrows(
    () => container.get(name4),
    UndefinedError,
    `(anonymous class) is undefined!
resolve stack:
  [0] (anonymous class)`,
  ) as UndefinedError;
  assertStrictEquals(error4.target, name4);
  assertArrayEquals(error4.resolveStack, [name4]);
});

Deno.test("undefined error (stack)", () => {
  class Something {}
  const testcases = [
    {
      stack: ["resolver1", "instance"],
      errorMessage: `"resolver1" is undefined!
resolve stack:
  [0] "resolver1"
  [1] "instance"`,
    },
    {
      stack: ["resolver2", Symbol("symbol2")],
      errorMessage: `"resolver2" is undefined!
resolve stack:
  [0] "resolver2"
  [1] Symbol(symbol2)`,
    },
    {
      stack: ["resolver3", Something],
      errorMessage: `"resolver3" is undefined!
resolve stack:
  [0] "resolver3"
  [1] Something`,
    },
    {
      stack: ["resolver4", (() => class {})()],
      errorMessage: `"resolver4" is undefined!
resolve stack:
  [0] "resolver4"
  [1] (anonymous class)`,
    },
  ];

  const container = new Container();

  for (const { stack, errorMessage } of testcases) {
    container.resolver(
      stack[0],
      () => ({ instance: container.get(stack[1]) }),
    );
    const err = assertThrows(
      () => container.get(stack[0]),
      UndefinedError,
      errorMessage,
    ) as UndefinedError;
    assertStrictEquals(err.target, stack[0]);
    assertArrayEquals(err.resolveStack, stack);
  }
});

Deno.test("undefined error (stack)", () => {
  class Bind1 {
    @Inject("instance1")
    public param: any;
  }

  const symbol2 = Symbol("symbol2");
  class Bind2 {
    @Inject(symbol2)
    public param: any;
  }

  class Something {}
  class Bind3 {
    @Inject(Something)
    public param: any;
  }

  const anonymous = (() => class {})();
  class Bind4 {
    @Inject(anonymous)
    public param: any;
  }

  const testcases: { stack: [any, any]; errorMessage: string }[] = [
    {
      stack: [Bind1, "instance1"],
      errorMessage: `Bind1 is undefined!
resolve stack:
  [0] Bind1
  [1] "instance1"`,
    },
    {
      stack: [Bind2, symbol2],
      errorMessage: `Bind2 is undefined!
resolve stack:
  [0] Bind2
  [1] Symbol(symbol2)`,
    },
    {
      stack: [Bind3, Something],
      errorMessage: `Bind3 is undefined!
resolve stack:
  [0] Bind3
  [1] Something`,
    },
    {
      stack: [Bind4, anonymous],
      errorMessage: `Bind4 is undefined!
resolve stack:
  [0] Bind4
  [1] (anonymous class)`,
    },
  ];

  const container = new Container();

  for (const { stack, errorMessage } of testcases) {
    container.bind(stack[0], stack[0]);
    const err = assertThrows(
      () => container.get(stack[0]),
      UndefinedError,
      errorMessage,
    ) as UndefinedError;
    assertStrictEquals(err.target, stack[0]);
    assertArrayEquals(err.resolveStack, stack);
  }
});

Deno.test("undefined error (alias)", () => {
  class Something {}

  const container = new Container();

  container.resolver("instance", () => ({ instance: container.get("alias1") }));
  container.alias("alias1", "alias2");
  container.alias("alias2", Something);

  const err1 = assertThrows(
    () => container.get("alias2"),
    UndefinedError,
    `Something is undefined!
resolve stack:
  [0] (alias) "alias2"
  [1] Something`,
  ) as UndefinedError;
  assertStrictEquals(err1.target, Something);
  assertEquals(err1.resolveStack, [
    { alias: "alias2" },
    Something,
  ]);

  const err2 = assertThrows(
    () => container.get("instance"),
    UndefinedError,
    `"instance" is undefined!
resolve stack:
  [0] "instance"
  [1] (alias) "alias1"
  [2] (alias) "alias2"
  [3] Something`,
  ) as UndefinedError;
  assertStrictEquals(err2.target, "instance");
  assertEquals(err2.resolveStack, [
    "instance",
    { alias: "alias1" },
    { alias: "alias2" },
    Something,
  ]);
});

Deno.test("undefined error (many stack)", () => {
  class Something {}

  const container = new Container();

  const stack = [
    "instance",
    Symbol("symbol"),
    Something,
    (() => class {})(),
    "unknown",
  ];

  container.resolver(stack[0], () => ({ instance: container.get(stack[1]) }));
  container.resolver(stack[1], () => ({ instance: container.get(stack[2]) }));
  container.resolver(stack[2], () => ({ instance: container.get(stack[3]) }));
  container.resolver(stack[3], () => ({ instance: container.get(stack[4]) }));

  const err = assertThrows(
    () => container.get(stack[0]),
    UndefinedError,
    `"instance" is undefined!
resolve stack:
  [0] "instance"
  [1] Symbol(symbol)
  [2] Something
  [3] (anonymous class)
  [4] "unknown"`,
  ) as UndefinedError;
  assertStrictEquals(err.target, stack[0]);
  assertArrayEquals(err.resolveStack, stack);
});
