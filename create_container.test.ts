import {
  assertEquals,
  assertFalse,
  assertInstanceOf,
  assertNotStrictEquals,
  assertStrictEquals,
  assertThrows,
  fail,
} from "testing/asserts.ts";

import { Container } from "./container.ts";
import { Inject } from "./decorator/inject.ts";
import { UndefinedError } from "./error/undefined_error.ts";
import { ServiceIdentifier } from "./service_identifier.ts";
import { ConstructType, Lifetime } from "./types.ts";
import { createContainer } from "./create_container.ts";

function assertContainerHasSingleton(
  container: Container,
  identifier: ServiceIdentifier<unknown>,
) {
  if (typeof identifier === "function") {
    assertInstanceOf(
      container.resolve(identifier),
      identifier as ConstructType<unknown>,
    );
  }
  assertStrictEquals(
    container.resolve(identifier),
    container.resolve(identifier),
  );
}

async function assertContainerUndefined(
  container: Container,
  identifier: ServiceIdentifier<unknown>,
) {
  assertFalse(container.has(identifier));
  try {
    await container.resolve(identifier);
    fail("should throw UndefinedError");
  } catch (e) {
    assertInstanceOf(e, UndefinedError);
  }
}

Deno.test("createContainer, define value", () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = createContainer();
  container.value("message", "hello world!");
  container.value(Foo, new Foo("hello world!"));

  assertEquals(container.resolve("message"), "hello world!");
  assertEquals(container.resolve(Foo), new Foo("hello world!"));

  assertStrictEquals(container.resolve(Foo), container.resolve(Foo)); // singleton
});

Deno.test("createContainer, define resolver", () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = createContainer();

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

Deno.test("createContainer, define promise resolver", async () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = createContainer();

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

Deno.test("createContainer, define bind", () => {
  const container = createContainer();

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

Deno.test("createContainer, define alias", () => {
  const container = createContainer();

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

Deno.test("createContainer, has", () => {
  const container = createContainer();

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

Deno.test("createContainer, resolve with inject", () => {
  const container = createContainer();

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

Deno.test("createContainer, resolve with inject from parent", () => {
  const container = createContainer();

  class Driver {
  }

  class Connection {
    @Inject(Driver)
    driver!: Driver;

    @Inject("CONNECTION_TIMEOUT")
    timeout!: number;
  }

  class DatabaseConnection extends Connection {
    @Inject("DB_CONNECTION_TIMEOUT")
    declare timeout: number;
  }

  container.value("CONNECTION_TIMEOUT", 1000);
  container.value("DB_CONNECTION_TIMEOUT", 2000);
  container.bind(Driver);
  container.bind(Connection, DatabaseConnection);

  const driver = container.resolve(Driver);
  const connection = container.resolve(Connection);

  assertInstanceOf(driver, Driver);
  assertInstanceOf(connection, DatabaseConnection);
  assertInstanceOf(connection, Connection);

  assertInstanceOf(connection.driver, Driver);
  assertStrictEquals(connection.timeout, 2000); // override
});

Deno.test("createContainer, run create (factory)", () => {
  const container = createContainer();

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

Deno.test("createContainer, resolve circular dependency bind", () => {
  const container = createContainer();

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

Deno.test("createContainer, resolve self dependency bind", () => {
  const container = createContainer();

  class SelfDependency {
    @Inject(SelfDependency)
    public self!: SelfDependency;
  }

  container.bind(SelfDependency);

  const value = container.resolve(SelfDependency);

  assertInstanceOf(value, SelfDependency);

  assertStrictEquals(value.self, value);
});

Deno.test("createContainer, boot", async () => {
  const container = createContainer();

  let countCallConfigure = 0;
  let countCallBoot = 0;

  container.register({
    provide() {
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

Deno.test("createContainer, close", async () => {
  const container = createContainer();

  let countCallConfigure = 0;
  let countCallBoot = 0;
  let countCallClose = 0;

  container.register({
    provide() {
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

Deno.test("createContainer, boot with promise", async () => {
  const container = createContainer();

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

Deno.test("createContainer, UndefinedError", async (t) => {
  const container = createContainer();

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

Deno.test("createContainer, UndefinedError with alias", () => {
  class Something {}

  const container = createContainer();

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

Deno.test("createContainer, UndefinedError (many stack)", () => {
  class Something {}
  const symbol = Symbol("symbol");
  const anonymousClass = (() => class {})();

  const container = createContainer();

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

Deno.test("createContainer, predefined values", () => {
  const container = createContainer();

  assertStrictEquals(container.resolve(Container), container);
  assertStrictEquals(container.resolve("@"), container);

  const scopedContainer = container.scope();

  assertStrictEquals(scopedContainer.resolve(Container), scopedContainer);
  assertStrictEquals(scopedContainer.resolve("@"), container);

  // 2-depth
  const scopedContainer2 = scopedContainer.scope();

  assertStrictEquals(scopedContainer2.resolve(Container), scopedContainer2);
  assertStrictEquals(scopedContainer2.resolve("@"), container);
});

Deno.test("createContainer, lifetime transient", () => {
  class BindClass {}
  class ResolveClass {}

  const container = createContainer();

  container.bind(BindClass).lifetime(Lifetime.Transient);
  container.resolver(ResolveClass, () => new ResolveClass()).lifetime(
    Lifetime.Transient,
  );

  assertInstanceOf(container.resolve(BindClass), BindClass);
  assertNotStrictEquals(
    container.resolve(BindClass),
    container.resolve(BindClass),
  );

  assertInstanceOf(container.resolve(ResolveClass), ResolveClass);
  assertNotStrictEquals(
    container.resolve(ResolveClass),
    container.resolve(ResolveClass),
  );
});

Deno.test("createContainer, lifetime singleton", () => {
  class BindClass {}
  class ResolveClass {}

  const container = createContainer();

  container.bind(BindClass).lifetime(Lifetime.Singleton);
  container.resolver(ResolveClass, () => new ResolveClass()).lifetime(
    Lifetime.Singleton,
  );

  assertInstanceOf(container.resolve(BindClass), BindClass);
  assertStrictEquals(
    container.resolve(BindClass),
    container.resolve(BindClass),
  );

  assertInstanceOf(container.resolve(ResolveClass), ResolveClass);
  assertStrictEquals(
    container.resolve(ResolveClass),
    container.resolve(ResolveClass),
  );
});

Deno.test("createContainer, lifetime scoped", () => {
  class ScopedBindClass {}
  class ScopedResolveClass {}
  class SingletonBindClass {}
  class SingletonResolveClass {}

  const container = createContainer();

  container.bind(ScopedBindClass).lifetime(Lifetime.Scoped);
  container.resolver(ScopedResolveClass, () => new ScopedResolveClass())
    .lifetime(
      Lifetime.Scoped,
    );
  container.bind(SingletonBindClass).lifetime(Lifetime.Singleton);
  container.resolver(SingletonResolveClass, () => new SingletonResolveClass())
    .lifetime(
      Lifetime.Singleton,
    );

  // singleton!
  assertContainerHasSingleton(container, ScopedBindClass);
  assertContainerHasSingleton(container, ScopedResolveClass);

  {
    const scopedContainer = container.scope();

    assertContainerHasSingleton(scopedContainer, ScopedBindClass);
    assertContainerHasSingleton(scopedContainer, ScopedResolveClass);

    // singleton is same
    assertStrictEquals(
      scopedContainer.resolve(SingletonBindClass),
      container.resolve(SingletonBindClass),
    );
    // but different from parent container
    assertNotStrictEquals(
      scopedContainer.resolve(ScopedBindClass),
      container.resolve(ScopedBindClass),
    );
  }
});

Deno.test("createContainer, lifetime scoped, split container space", () => {
  const container = createContainer();

  {
    class BindClass {}
    class ResolveClass {}

    const scopedContainer = container.scope();

    scopedContainer.bind(BindClass);
    scopedContainer.resolver(
      ResolveClass,
      () => new ResolveClass(),
    );

    assertContainerHasSingleton(scopedContainer, BindClass);
    assertContainerHasSingleton(scopedContainer, ResolveClass);

    assertContainerUndefined(container, BindClass);
    assertContainerUndefined(container, ResolveClass);
  }
});