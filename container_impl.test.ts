import {
  assertEquals,
  assertInstanceOf,
  assertNotStrictEquals,
  assertStrictEquals,
  assertThrows,
  fail,
} from "testing/asserts.ts";

import { ContainerImpl } from "./container_impl.ts";
import { Inject } from "./decorator/inject.ts";
import { UndefinedError } from "./error/undefined_error.ts";
import { ServiceIdentifier } from "./service_identifier.ts";

// function assertArrayEquals(actual: unknown[], expected: unknown[]) {
//   assertEquals(actual.length, expected.length);
//   actual.forEach((item, itemIndex) => {
//     assertStrictEquals(item, expected[itemIndex]);
//   });
// }

Deno.test("ContainerImpl, define value", () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = new ContainerImpl();
  container.value("message", "hello world!");
  container.value(Foo, new Foo("hello world!"));

  assertEquals(container.resolve("message"), "hello world!");
  assertEquals(container.resolve(Foo), new Foo("hello world!"));

  assertStrictEquals(container.resolve(Foo), container.resolve(Foo)); // singleton
});

Deno.test("ContainerImpl, define resolver", () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = new ContainerImpl();

  container.resolver("resolver", () => ({ message: "this is resolver" }));
  container.resolver(Foo, () => new Foo("this is foo"));

  assertEquals(container.resolve("resolver"), { message: "this is resolver" });
  assertEquals(container.resolve(Foo), new Foo("this is foo"));

  assertStrictEquals(
    container.resolve("resolver"),
    container.resolve("resolver"),
  );
  assertStrictEquals(container.resolve(Foo), container.resolve(Foo)); // singleton
});

Deno.test("ContainerImpl, define promise resolver", async () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = new ContainerImpl();

  container.resolver(
    Foo,
    () =>
      new Promise<Foo>((resolve) =>
        setTimeout(() => resolve(new Foo("promise resolver")), 50)
      ),
  );

  assertInstanceOf(container.resolve(Foo), Promise);
  assertStrictEquals(
    container.resolve(Foo),
    container.resolve(Foo),
  ); // promise is also singleton

  const value = await container.resolve(Foo);

  assertEquals(value, new Foo("promise resolver"));
  assertStrictEquals(container.resolve(Foo), value); // singleton
});

Deno.test("ContainerImpl, define bind", () => {
  const container = new ContainerImpl();

  class Driver1 {
  }

  class Driver2 {
  }

  container.bind("driver1", Driver1);
  container.bind(Driver2);

  const result1 = container.resolve<Driver1>("driver1");
  const result2 = container.resolve(Driver2);

  assertInstanceOf(result1, Driver1);
  assertInstanceOf(result2, Driver2);

  assertStrictEquals(container.resolve("driver1"), result1); // same instance (singleton)
  assertStrictEquals(container.resolve(Driver2), result2); // same instance (singleton)`
});

Deno.test("ContainerImpl, define alias", () => {
  const container = new ContainerImpl();

  class Driver1 {
  }

  class Driver2 {
  }

  container.value("value", { message: "this is value" });
  container.resolver("resolver", () => ({ message: "this is resolver" }));
  container.bind("driver1", Driver1);
  container.bind(Driver2);

  container.alias("alias1", "value");
  container.alias("alias2", "resolver");
  container.alias("alias3", "driver1");
  container.alias("alias4", Driver2);

  const result1 = container.resolve("value");
  const result2 = container.resolve("resolver");
  const result3 = container.resolve("driver1");
  const result4 = container.resolve(Driver2);

  assertStrictEquals(result1, container.resolve("alias1"));
  assertStrictEquals(result2, container.resolve("alias2"));
  assertStrictEquals(result3, container.resolve("alias3"));
  assertStrictEquals(result4, container.resolve("alias4"));
});

Deno.test("ContainerImpl, has", () => {
  const container = new ContainerImpl();

  class Driver1 {
  }

  class Driver2 {
  }

  container.value("value", { message: "this is value" });
  container.resolver("resolver", () => ({ message: "this is resolver" }));
  container.bind("driver1", Driver1);
  container.bind(Driver2);
  container.alias("alias1", "value");
  container.alias("alias2", "broken");

  assertEquals(container.has("value"), true);
  assertEquals(container.has("resolver"), true);
  assertEquals(container.has("driver1"), true);
  assertEquals(container.has(Driver2), true);
  assertEquals(container.has("alias1"), true);
  assertEquals(container.has("alias2"), false); // ?!

  assertEquals(container.has("unknown"), false);
});

Deno.test("ContainerImpl, resolve with inject", () => {
  const container = new ContainerImpl();

  class Driver {
  }

  class Connection {
    @Inject(Driver)
    driver!: Driver;
  }

  container.bind(Driver);
  container.bind(Connection);

  const driver = container.resolve(Driver);
  const connection = container.resolve(Connection);

  assertInstanceOf(driver, Driver);
  assertInstanceOf(connection, Connection);

  assertInstanceOf(connection.driver, Driver);
});

Deno.test("ContainerImpl, run create (factory)", () => {
  const container = new ContainerImpl();

  class Connection {
  }

  class Controller {
    @Inject("connection")
    public connection!: Connection;
  }

  container.bind("connection", Connection);

  const controller = container.create(Controller);

  assertInstanceOf(controller, Controller);
  assertInstanceOf(
    controller.connection,
    Connection,
  );

  assertNotStrictEquals(container.create(Controller), controller);
});

Deno.test("ContainerImpl, resolve circular dependency bind", () => {
  const container = new ContainerImpl();

  class A {
    @Inject("b")
    public b!: B;
  }

  class B {
    @Inject("a")
    public a!: A;
  }

  container.bind("a", A);
  container.bind("b", B);

  // assert
  const instA = container.resolve<A>("a");
  const instB = container.resolve<B>("b");

  assertInstanceOf(instA, A);
  assertInstanceOf(instB, B);

  assertStrictEquals(instA.b, instB);
  assertStrictEquals(instB.a, instA);
});

Deno.test("ContainerImpl, resolve self dependency bind", () => {
  const container = new ContainerImpl();

  class SelfDependency {
    @Inject(SelfDependency)
    public self!: SelfDependency;
  }

  container.bind(SelfDependency);

  const value = container.resolve(SelfDependency);

  assertInstanceOf(value, SelfDependency);

  assertStrictEquals(value.self, value);
});

Deno.test("ContainerImpl, boot", async () => {
  const container = new ContainerImpl();

  let countCallConfigure = 0;
  let countCallBoot = 0;

  container.register({
    configure() {
      countCallConfigure++;
    },
    boot() {
      countCallBoot++;
    },
  });

  container.boot();
  container.boot();
  await container.boot();

  assertEquals(countCallConfigure, 1);
  assertEquals(countCallBoot, 1);
});

Deno.test("ContainerImpl, close", async () => {
  const container = new ContainerImpl();

  let countCallConfigure = 0;
  let countCallBoot = 0;
  let countCallClose = 0;

  container.register({
    configure() {
      countCallConfigure++;
    },
    boot() {
      countCallBoot++;
    },
    close() {
      countCallClose++;
    },
  });

  await container.boot();
  await container.close(); // reset

  await container.boot();

  assertEquals(countCallConfigure, 2);
  assertEquals(countCallBoot, 2);
  assertEquals(countCallClose, 1);
});

Deno.test("ContainerImpl, boot with promise", async () => {
  const container = new ContainerImpl();

  container.value("instance", Promise.resolve({ name: "instance" }));
  container.resolver("resolver", () => {
    return Promise.resolve({ name: "resolver" });
  });

  const promiseInstance = container.resolve("instance");
  const promiseResolver = container.resolve("resolver");

  assertEquals(promiseInstance instanceof Promise, true);
  assertEquals(promiseResolver instanceof Promise, true);

  await container.boot();

  assertEquals(container.get("instance"), { name: "instance" });
  assertEquals(container.get("resolver"), { name: "resolver" });

  assertStrictEquals(container.get("instance"), await promiseInstance);
  assertStrictEquals(container.get("resolver"), await promiseResolver);
});

Deno.test("ContainerImpl, UndefinedError", async (t) => {
  const container = new ContainerImpl();

  class Something {}

  const cases: {
    name: string;
    id: ServiceIdentifier<unknown>;
    errorMessage: string;
    resolveStackString: string;
  }[] = [
    {
      name: "string",
      id: "instance",
      errorMessage: `"instance" is undefined!`,
      resolveStackString: `resolve stack:
  [0] "instance"`,
    },
    {
      name: "symbol",
      id: Symbol("symbol"),
      errorMessage: `Symbol(symbol) is undefined!`,
      resolveStackString: `resolve stack:
  [0] Symbol(symbol)`,
    },
    {
      name: "class",
      id: Something,
      errorMessage: `[class Something] is undefined!`,
      resolveStackString: `resolve stack:
  [0] [class Something]`,
    },
    {
      name: "unknown class",
      id: (() => class {})(),
      errorMessage: `[anonymous class] is undefined!`,
      resolveStackString: `resolve stack:
  [0] [anonymous class]`,
    },
  ];

  await Promise.all(
    cases.map(({ name, id, errorMessage, resolveStackString }) => {
      return t.step({
        name,
        fn: () => {
          const error = assertThrows(
            () => container.resolve(id),
            UndefinedError,
            errorMessage,
          ) as UndefinedError;
          assertStrictEquals(error.target, id);
          assertEquals(error.resolveStack, [{ id: id }]);
          assertEquals(error.resolveStack.toString(), resolveStackString);
        },
        sanitizeOps: false,
        sanitizeResources: false,
        sanitizeExit: false,
      });
    }),
  );
});

Deno.test("ContainerImpl, UndefinedError with alias", () => {
  class Something {}

  const container = new ContainerImpl();

  container.resolver(
    "instance",
    () => ({ instance: container.resolve("alias1") }),
  );
  container.alias("alias1", "alias2");
  container.alias("alias2", Something);

  {
    try {
      container.resolve("alias2");
      fail();
    } catch (e) {
      assertInstanceOf(e, UndefinedError);
      assertEquals(
        e.message,
        `[class Something] is undefined!`,
      );
      assertEquals(e.resolveStack, [
        { id: "alias2", alias: true },
        { id: Something },
      ]);
      assertEquals(
        e.resolveStack.toString(),
        `resolve stack:
  [0] (alias) "alias2"
  [1] [class Something]`,
      );
    }
  }

  {
    try {
      container.resolve("instance");
      fail();
    } catch (e) {
      assertInstanceOf(e, UndefinedError);
      assertEquals(
        e.message,
        `"instance" is undefined!`,
      );
      assertEquals(
        e.resolveStack.toString(),
        `resolve stack:
  [0] "instance"
  [1] (alias) "alias1"
  [2] (alias) "alias2"
  [3] [class Something]`,
      );
      assertEquals(e.resolveStack, [
        { id: "instance" },
        { id: "alias1", alias: true },
        { id: "alias2", alias: true },
        { id: Something },
      ]);
    }
  }
});

Deno.test("ContainerImpl, UndefinedError (many stack)", () => {
  class Something {}
  const symbol = Symbol("symbol");
  const anonymousClass = (() => class {})();

  const container = new ContainerImpl();

  container.resolver(
    "instance",
    () => ({ instance: container.resolve(symbol) }),
  );
  container.resolver(
    symbol,
    () => ({ instance: container.resolve(Something) }),
  );
  container.resolver(
    Something,
    () => ({ instance: container.resolve(anonymousClass) }),
  );
  container.resolver(
    anonymousClass,
    () => ({ instance: container.resolve("unknown") }),
  );

  try {
    container.resolve("instance");
  } catch (e) {
    assertInstanceOf(e, UndefinedError);
    assertEquals(
      e.message,
      `"instance" is undefined!`,
    );
    assertEquals(
      e.resolveStack.toString(),
      `resolve stack:
  [0] "instance"
  [1] Symbol(symbol)
  [2] [class Something]
  [3] [anonymous class]
  [4] "unknown"`,
    );
    assertEquals(e.resolveStack, [
      { id: "instance" },
      { id: symbol },
      { id: Something },
      { id: anonymousClass },
      { id: "unknown" },
    ]);
  }
});
