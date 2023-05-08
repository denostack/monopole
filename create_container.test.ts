import {
  assert,
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
import { SYMBOL_ROOT_CONTAINER } from "./constants.ts";

async function assertContainerHasSingleton(
  container: Container,
  identifier: ServiceIdentifier<unknown>,
) {
  if (typeof identifier === "function") {
    assertInstanceOf(
      await container.resolve(identifier),
      identifier as ConstructType<unknown>,
    );
  }
  assertStrictEquals(
    await container.resolve(identifier),
    await container.resolve(identifier),
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

Deno.test("createContainer, define value", async () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = createContainer();
  container.value("message", "hello world!");
  container.value(Foo, new Foo("hello world!"));

  assertEquals(container.get("message"), "hello world!");
  assertEquals(container.get(Foo), new Foo("hello world!"));

  const resolved1 = container.resolve("message");
  const resolved2 = container.resolve(Foo);

  assertInstanceOf(resolved1, Promise);
  assertInstanceOf(resolved2, Promise);

  assertEquals(await resolved1, "hello world!");
  assertEquals(await resolved2, new Foo("hello world!"));

  assertStrictEquals(
    await container.resolve(Foo),
    await container.resolve(Foo),
  ); // singleton
});

Deno.test("createContainer, define resolver", async () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = createContainer();

  container.resolver("resolver", () => ({ message: "this is resolver" }));
  container.resolver(Foo, () => new Foo("this is foo"));

  const resolved1 = container.resolve("resolver");
  const resolved2 = container.resolve(Foo);

  assertInstanceOf(resolved1, Promise);
  assertInstanceOf(resolved2, Promise);

  assertEquals(await resolved1, { message: "this is resolver" });
  assertEquals(await resolved2, new Foo("this is foo"));

  assertStrictEquals(
    await container.resolve("resolver"),
    await container.resolve("resolver"),
  ); // singleton
  assertStrictEquals(
    await container.resolve(Foo),
    await container.resolve(Foo),
  ); // singleton
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

  const resolved = container.resolve(Foo);
  assertInstanceOf(resolved, Promise);

  assertEquals(await resolved, new Foo("promise resolver"));
  assertStrictEquals(
    await container.resolve(Foo),
    await container.resolve(Foo),
  ); // singleton
});

Deno.test("createContainer, define bind", async () => {
  const container = createContainer();

  class Driver1 {
  }

  class Driver2 {
  }

  container.bind("driver1", Driver1);
  container.bind(Driver2);

  const resolved1 = container.resolve<Driver1>("driver1");
  const resolved2 = container.resolve(Driver2);

  assertInstanceOf(resolved1, Promise);
  assertInstanceOf(resolved2, Promise);

  assertInstanceOf(await resolved1, Driver1);
  assertInstanceOf(await resolved2, Driver2);

  assertStrictEquals(await container.resolve("driver1"), await resolved1); // same instance (singleton)
  assertStrictEquals(await container.resolve(Driver2), await resolved2); // same instance (singleton)`
});

Deno.test("createContainer, define alias", async () => {
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

  const result1 = await container.resolve("value");
  const result2 = await container.resolve("resolver");
  const result3 = await container.resolve("driver1");
  const result4 = await container.resolve(Driver2);

  assertStrictEquals(result1, await container.resolve("alias1"));
  assertStrictEquals(result2, await container.resolve("alias2"));
  assertStrictEquals(result3, await container.resolve("alias3"));
  assertStrictEquals(result4, await container.resolve("alias4"));
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

  assert(container.has(Container));
  assert(container.has(SYMBOL_ROOT_CONTAINER));

  assertEquals(container.has("value"), true);
  assertEquals(container.has("resolver"), true);
  assertEquals(container.has("driver1"), true);
  assertEquals(container.has(Driver2), true);
  assertEquals(container.has("alias1"), true);
  assertEquals(container.has("alias2"), false); // ?!

  assertEquals(container.has("unknown"), false);
});

Deno.test("createContainer, resolve with inject", async () => {
  const container = createContainer();

  class Driver {
  }

  class Connection {
    @Inject(Driver)
    driver!: Driver;
  }

  container.bind(Driver);
  container.bind(Connection);

  const driverPromise = container.resolve(Driver);
  const connectionPromise = container.resolve(Connection);

  assertInstanceOf(driverPromise, Promise);
  assertInstanceOf(connectionPromise, Promise);

  const driver = await driverPromise;
  const connection = await connectionPromise;

  assertInstanceOf(driver, Driver);
  assertInstanceOf(connection, Connection);

  assertInstanceOf(connection.driver, Driver);
});

Deno.test("createContainer, resolve with inject from parent", async () => {
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

  const driver = await container.resolve(Driver);
  const connection = await container.resolve(Connection);

  assertInstanceOf(driver, Driver);
  assertInstanceOf(connection, DatabaseConnection);
  assertInstanceOf(connection, Connection);

  assertInstanceOf(connection.driver, Driver);
  assertStrictEquals(connection.timeout, 2000); // override
});

Deno.test("createContainer, run create (factory)", async () => {
  const container = createContainer();

  class Connection {
  }

  class Controller {
    @Inject("connection")
    public connection!: Connection;
  }

  container.bind("connection", Connection);

  const controller = await container.create(Controller);

  assertInstanceOf(controller, Controller);
  assertInstanceOf(
    controller.connection,
    Connection,
  );

  assertNotStrictEquals(await container.create(Controller), controller);
});

Deno.test("createContainer, resolve circular dependency bind", async () => {
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
  const instA = await container.resolve<A>("a");
  const instB = await container.resolve<B>("b");

  assertInstanceOf(instA, A);
  assertInstanceOf(instB, B);

  assertStrictEquals(instA.b, instB);
  assertStrictEquals(instB.a, instA);
});

Deno.test("createContainer, resolve self dependency bind", async () => {
  const container = createContainer();

  class SelfDependency {
    @Inject(SelfDependency)
    public self!: SelfDependency;
  }

  container.bind(SelfDependency);

  const value = await container.resolve(SelfDependency);

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

Deno.test("createContainer, UndefinedError with alias", async () => {
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
      await container.resolve("instance");
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

Deno.test("createContainer, UndefinedError (many stack)", async () => {
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
    await container.resolve("instance");
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

Deno.test("createContainer, predefined values", async () => {
  const container = createContainer();

  assertStrictEquals(container.get(Container), container);
  assertStrictEquals(container.get(SYMBOL_ROOT_CONTAINER), container);

  assertStrictEquals(await container.resolve(Container), container);
  assertStrictEquals(await container.resolve(SYMBOL_ROOT_CONTAINER), container);

  // 1-depth
  const scopedContainer = await container.scope();

  assertStrictEquals(scopedContainer.get(Container), scopedContainer);
  assertStrictEquals(
    scopedContainer.get(SYMBOL_ROOT_CONTAINER),
    container,
  );

  assertStrictEquals(await scopedContainer.resolve(Container), scopedContainer);
  assertStrictEquals(
    await scopedContainer.resolve(SYMBOL_ROOT_CONTAINER),
    container,
  );

  // 2-depth
  const scopedContainer2 = await scopedContainer.scope();

  assertStrictEquals(
    scopedContainer2.get(Container),
    scopedContainer2,
  );
  assertStrictEquals(
    scopedContainer2.get(SYMBOL_ROOT_CONTAINER),
    container,
  );

  assertStrictEquals(
    await scopedContainer2.resolve(Container),
    scopedContainer2,
  );
  assertStrictEquals(
    await scopedContainer2.resolve(SYMBOL_ROOT_CONTAINER),
    container,
  );
});

Deno.test("createContainer, lifetime transient", async () => {
  class BindClass {}
  class ResolveClass {}

  const container = createContainer();

  container.bind(BindClass).lifetime(Lifetime.Transient);
  container.resolver(ResolveClass, () => new ResolveClass()).lifetime(
    Lifetime.Transient,
  );

  assertInstanceOf(await container.resolve(BindClass), BindClass);
  assertNotStrictEquals(
    await container.resolve(BindClass),
    await container.resolve(BindClass),
  );

  assertInstanceOf(await container.resolve(ResolveClass), ResolveClass);
  assertNotStrictEquals(
    await container.resolve(ResolveClass),
    await container.resolve(ResolveClass),
  );
});

Deno.test("createContainer, lifetime singleton", async () => {
  class BindClass {}
  class ResolveClass {}

  const container = createContainer();

  container.bind(BindClass).lifetime(Lifetime.Singleton);
  container.resolver(ResolveClass, () => new ResolveClass()).lifetime(
    Lifetime.Singleton,
  );

  assertInstanceOf(await container.resolve(BindClass), BindClass);
  assertStrictEquals(
    await container.resolve(BindClass),
    await container.resolve(BindClass),
  );

  assertInstanceOf(await container.resolve(ResolveClass), ResolveClass);
  assertStrictEquals(
    await container.resolve(ResolveClass),
    await container.resolve(ResolveClass),
  );
});

Deno.test("createContainer, lifetime scoped", async () => {
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
  await assertContainerHasSingleton(container, ScopedBindClass);
  await assertContainerHasSingleton(container, ScopedResolveClass);

  {
    const scopedContainer = await container.scope();

    await assertContainerHasSingleton(scopedContainer, ScopedBindClass);
    await assertContainerHasSingleton(scopedContainer, ScopedResolveClass);

    // singleton is same
    assertStrictEquals(
      await scopedContainer.resolve(SingletonBindClass),
      await container.resolve(SingletonBindClass),
    );
    // but different from parent container
    assertNotStrictEquals(
      await scopedContainer.resolve(ScopedBindClass),
      await container.resolve(ScopedBindClass),
    );
  }
});

Deno.test("createContainer, lifetime scoped, split container space", async () => {
  const container = createContainer();

  {
    class BindClass {}
    class ResolveClass {}

    const scopedContainer = await container.scope();

    scopedContainer.bind(BindClass);
    scopedContainer.resolver(
      ResolveClass,
      () => new ResolveClass(),
    );

    await assertContainerHasSingleton(scopedContainer, BindClass);
    await assertContainerHasSingleton(scopedContainer, ResolveClass);

    await assertContainerUndefined(container, BindClass);
    await assertContainerUndefined(container, ResolveClass);
  }
});
