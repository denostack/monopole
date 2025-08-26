import {
  assertEquals,
  assertInstanceOf,
  assertStrictEquals,
  assertThrows,
  fail,
} from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";

import { createContainer } from "./create_container.ts";
import { inject } from "./decorators/inject.ts";
import { UndefinedError } from "./error/undefined_error.ts";
import type { Module } from "./module.ts";
import type { ServiceIdentifier } from "./types.ts";

Deno.test("createContainer, define value", async () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = await createContainer({
    providers: [
      { id: "message", useValue: "hello world!" },
      { id: Foo, useValue: Promise.resolve(new Foo("hello world!")) },
    ],
    exports: ["message", Foo],
  });

  assertEquals(container.get<string>("message"), "hello world!");
  assertEquals(container.get(Foo), new Foo("hello world!"));

  assertStrictEquals(container.get(Foo), container.get(Foo));
});

Deno.test("createContainer, define useFactory", async () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = await createContainer({
    providers: [
      {
        id: "resolver",
        useFactory: () => ({ message: "this is resolver" }),
      },
      { id: Foo, useFactory: () => new Foo("this is foo") },
    ],
    exports: ["resolver", Foo],
  });

  assertEquals(container.get("resolver"), { message: "this is resolver" });
  assertEquals(container.get(Foo), new Foo("this is foo"));

  assertStrictEquals(container.get("resolver"), container.get("resolver"));
  assertStrictEquals(container.get(Foo), container.get(Foo));
});

Deno.test("createContainer, define useFactory with inject", async () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = await createContainer({
    providers: [
      {
        id: "resolver",
        inject: [Foo],
        useFactory: (foo: Foo) => ({ foo }),
      },
      { id: Foo, useFactory: () => new Foo("this is foo") },
    ],
    exports: ["resolver", Foo],
  });

  assertEquals(container.get("resolver"), { foo: new Foo("this is foo") });
  assertEquals(container.get(Foo), new Foo("this is foo"));

  assertStrictEquals(container.get("resolver"), container.get("resolver"));
  assertStrictEquals(
    container.get<{ foo: Foo }>("resolver").foo,
    container.get(Foo),
  );
  assertStrictEquals(container.get(Foo), container.get(Foo));
});

Deno.test("createContainer, define promise resolver", async () => {
  class Foo {
    constructor(public message: string) {}
  }

  const container = await createContainer({
    providers: [
      {
        id: Foo,
        useFactory: () =>
          new Promise<Foo>((resolve) =>
            setTimeout(() => resolve(new Foo("promise resolver")), 50)
          ),
      },
    ],
    exports: [Foo],
  });

  assertEquals(container.get(Foo), new Foo("promise resolver"));
  assertStrictEquals(container.get(Foo), container.get(Foo));
});

Deno.test("createContainer, define bind", async () => {
  class Driver1 {
  }

  class Driver2 {
  }

  const container = await createContainer({
    providers: [
      { id: "driver1", useClass: Driver1 },
      Driver2,
    ],
    exports: ["driver1", Driver2],
  });

  assertInstanceOf(container.get<Driver1>("driver1"), Driver1);
  assertInstanceOf(container.get(Driver2), Driver2);

  assertStrictEquals(container.get("driver1"), container.get("driver1"));
  assertStrictEquals(container.get(Driver2), container.get(Driver2));
});

Deno.test("createContainer, define alias", async () => {
  class Driver1 {
  }

  class Driver2 {
  }

  const container = await createContainer({
    providers: [
      { id: "value", useValue: { message: "this is value" } },
      { id: "resolver", useFactory: () => ({ message: "this is resolver" }) },
      { id: "driver1", useClass: Driver1 },
      Driver2,
      { id: "alias1", useExisting: "value" },
      { id: "alias2", useExisting: "resolver" },
      { id: "alias3", useExisting: "driver1" },
      { id: "alias4", useExisting: Driver2 },
    ],
    exports: [
      "value",
      "resolver",
      "driver1",
      Driver2,
      "alias1",
      "alias2",
      "alias3",
      "alias4",
    ],
  });

  assertStrictEquals(container.get("value"), container.get("alias1"));
  assertStrictEquals(container.get("resolver"), container.get("alias2"));
  assertStrictEquals(container.get("driver1"), container.get("alias3"));
  assertStrictEquals(container.get(Driver2), container.get("alias4"));
});

Deno.test("createContainer, has", async () => {
  class Driver1 {
  }

  class Driver2 {
  }

  const container = await createContainer({
    providers: [
      { id: "value", useValue: { message: "this is value" } },
      { id: "resolver", useFactory: () => ({ message: "this is resolver" }) },
      { id: "driver1", useClass: Driver1 },
      Driver2,
      { id: "alias", useExisting: "value" },
    ],
    exports: [
      "value",
      "resolver",
      "driver1",
      Driver2,
      "alias",
    ],
  });

  assertEquals(container.has("value"), true);
  assertEquals(container.has("resolver"), true);
  assertEquals(container.has("driver1"), true);
  assertEquals(container.has(Driver2), true);
  assertEquals(container.has("alias"), true);

  assertEquals(container.has("unknown"), false);
});

Deno.test("createContainer, resolve with inject", async () => {
  class Driver {
  }

  class Connection {
    @inject(Driver)
    driver!: Driver;
  }

  const container = await createContainer({
    providers: [
      Driver,
      Connection,
    ],
    exports: [Driver, Connection],
  });

  assertInstanceOf(container.get(Driver), Driver);
  assertInstanceOf(container.get(Connection), Connection);

  assertStrictEquals(container.get(Connection).driver, container.get(Driver));
});

Deno.test("createContainer, resolve with inject from parent", async () => {
  class Driver {
  }

  class Connection {
    @inject(Driver)
    driver!: Driver;

    @inject("CONNECTION_TIMEOUT")
    timeout!: number;
  }

  class DatabaseConnection extends Connection {
    @inject("DB_CONNECTION_TIMEOUT")
    override timeout: number = -1;
  }

  const container = await createContainer({
    providers: [
      { id: "CONNECTION_TIMEOUT", useValue: 1000 },
      { id: "DB_CONNECTION_TIMEOUT", useValue: 2000 },
      Driver,
      { id: Connection, useClass: DatabaseConnection },
    ],
    exports: [Driver, Connection],
  });

  const driver = container.get(Driver);
  const connection = container.get(Connection);

  assertInstanceOf(driver, Driver);
  assertInstanceOf(connection, DatabaseConnection);
  assertInstanceOf(connection, Connection);

  assertInstanceOf(connection.driver, Driver);
  assertStrictEquals(connection.timeout, 2000); // override
});

Deno.test("createContainer, resolve circular dependency bind", async () => {
  class Parent {
    @inject(() => Child)
    child!: Child;
  }

  class Child {
    @inject(() => Parent)
    parent!: Parent;
  }

  const container = await createContainer({
    providers: [
      Parent,
      Child,
    ],
    exports: [Parent, Child],
  });

  const parent = container.get(Parent);
  const child = container.get(Child);

  assertInstanceOf(parent, Parent);
  assertInstanceOf(child, Child);

  assertStrictEquals(parent.child, child);
  assertStrictEquals(child.parent, parent);
});

Deno.test("createContainer, resolve self dependency bind", async () => {
  class SelfDependency {
    @inject(() => SelfDependency)
    self!: SelfDependency;
  }

  const container = await createContainer({
    providers: [SelfDependency],
    exports: [SelfDependency],
  });

  const value = container.get(SelfDependency);

  assertInstanceOf(value, SelfDependency);

  assertStrictEquals(value.self, value);
});

Deno.test("createContainer, boot", async () => {
  let countCallBoot = 0;

  await createContainer({
    boot() {
      countCallBoot++;
    },
  });

  assertEquals(countCallBoot, 1);
});

Deno.test("createContainer, dispose", async () => {
  let countCallBoot = 0;
  let countCallDispose = 0;

  const container = await createContainer({
    boot() {
      countCallBoot++;
    },
    dispose() {
      countCallDispose++;
    },
  });

  container.dispose();
  container.dispose();
  await container.dispose();

  assertEquals(countCallBoot, 1);
  assertEquals(countCallDispose, 1);
});

Deno.test("createContainer, UndefinedError", async (t) => {
  const container = await createContainer({});

  class Something {}

  const cases: {
    name: string;
    id: ServiceIdentifier<unknown>;
    errorMessage: string;
    resolveStack: string[];
  }[] = [
    {
      name: "string",
      id: "instance",
      errorMessage: `"instance" is undefined!`,
      resolveStack: ['"instance"'],
    },
    {
      name: "symbol",
      id: Symbol("symbol"),
      errorMessage: `Symbol(symbol) is undefined!`,
      resolveStack: ["Symbol(symbol)"],
    },
    {
      name: "class",
      id: Something,
      errorMessage: `[class Something] is undefined!`,
      resolveStack: ["[class Something]"],
    },
    {
      name: "unknown class",
      id: (() => class {})(),
      errorMessage: `[anonymous class] is undefined!`,
      resolveStack: ["[anonymous class]"],
    },
  ];

  await Promise.all(
    cases.map(({ name, id, errorMessage, resolveStack }) => {
      return t.step({
        name,
        fn: () => {
          const error = assertThrows(
            () => container.get(id),
            UndefinedError,
            errorMessage,
          ) as UndefinedError;
          assertStrictEquals(error.id, id);
          assertEquals(error.resolveStack, resolveStack);
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
  try {
    await createContainer({
      providers: [
        { id: "alias", useExisting: Something },
      ],
    });
    fail();
  } catch (e) {
    assertInstanceOf(e, UndefinedError);
    assertEquals(
      e.message,
      '"alias" is undefined!',
    );
    assertEquals(e.resolveStack, [
      '"alias"',
      "[class Something]",
    ]);
  }
});

Deno.test("createContainer, UndefinedError (many stack)", async () => {
  class Something {}
  const symbol = Symbol("symbol");
  const anonymousClass = (() => class {})();

  try {
    await createContainer({
      providers: [
        { id: "instance", useExisting: symbol },
        { id: symbol, useExisting: Something },
        { id: Something, useExisting: anonymousClass },
        { id: anonymousClass, useExisting: "unknown" },
      ],
    });
  } catch (e) {
    assertInstanceOf(e, UndefinedError);
    assertEquals(
      e.message,
      `"instance" is undefined!`,
    );
    assertEquals(e.resolveStack, [
      '"instance"',
      "Symbol(symbol)",
      "[class Something]",
      "[anonymous class]",
      '"unknown"',
    ]);
  }
});

Deno.test("createContainer, module", async () => {
  class Database {
    connect() {
      return Promise.resolve(true);
    }
    dispose() {
      return Promise.resolve(true);
    }
  }

  const connectSpy = spy(Database.prototype, "connect");
  const disposeSpy = spy(Database.prototype, "dispose");

  const dbModule: Module = {
    providers: [
      Database,
    ],
    exports: [Database],
    async boot(container) {
      const connection = container.get(Database);
      await connection.connect();
    },
    async dispose(container) {
      const connection = await container.get(Database);
      await connection.dispose();
    },
  };

  class App {
    @inject(Database)
    connection!: Database;
  }

  const container = await createContainer({
    imports: [dbModule],
    providers: [
      App,
    ],
    exports: [App, Database],
  });

  assertSpyCalls(connectSpy, 1);
  assertSpyCalls(disposeSpy, 0);

  assertInstanceOf(container.get(App), App);
  assertInstanceOf(container.get(Database), Database);

  assertStrictEquals(container.get(App).connection, container.get(Database));

  container.dispose();
  container.dispose();
  await container.dispose();
  await container.dispose();

  assertSpyCalls(connectSpy, 1);
  assertSpyCalls(disposeSpy, 1);
});
