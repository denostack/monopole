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

function sleep(time: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, time));
}

Deno.test("should create container with value providers", async () => {
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

Deno.test("should create container with factory providers", async () => {
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

Deno.test("should create container with factory providers that have dependencies", async () => {
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

Deno.test("should resolve async factory providers", async () => {
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

Deno.test("should create container with class providers", async () => {
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

Deno.test("should create container with existing providers (aliases)", async () => {
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

Deno.test("should check if service exists in container", async () => {
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

Deno.test("should inject dependencies using @inject decorator", async () => {
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

Deno.test("should inject dependencies from parent class with override", async () => {
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

Deno.test("should resolve circular dependencies between classes", async () => {
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

Deno.test("should resolve self-referencing dependencies", async () => {
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

Deno.test("should call boot hook when creating container", async () => {
  let countCallBoot = 0;

  await createContainer({
    boot() {
      countCallBoot++;
    },
  });

  assertEquals(countCallBoot, 1);
});

Deno.test("should call dispose hook only once when disposing container", async () => {
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

Deno.test("should throw UndefinedError for unregistered services", async (t) => {
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

Deno.test("should throw UndefinedError with stack trace for alias chain", async () => {
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

Deno.test("should throw UndefinedError when injected dependency is undefined", async () => {
  class Unknown {}
  class Something {
    @inject(Unknown)
    unknown!: Unknown;
  }

  try {
    await createContainer({
      providers: [
        Something,
      ],
    });
    fail();
  } catch (e) {
    assertInstanceOf(e, UndefinedError);
    assertEquals(
      e.message,
      "[class Something] is undefined!",
    );
    assertEquals(e.resolveStack, [
      "[class Something]",
      "[class Unknown]",
    ]);
  }
});

Deno.test("should throw UndefinedError with complete resolution stack", async () => {
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

Deno.test("should support module imports with lifecycle hooks", async () => {
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

Deno.test("should support deeply nested modules with mixed async/sync providers and lifecycle hooks", async () => {
  const bootOrder: string[] = [];
  const disposeOrder: string[] = [];

  // Level 3: Core module (deepest level)
  class Logger {
    logs: string[] = [];
    log(message: string) {
      this.logs.push(message);
    }
  }

  class Config {
    constructor(public readonly env: string, public readonly debug: boolean) {}
  }

  const coreModule: Module = {
    providers: [
      Logger,
      {
        id: Config,
        useFactory: async () => {
          // Async factory that returns after delay
          await sleep(10);
          return new Config("production", false);
        },
      },
    ],
    exports: [Logger, Config],
    async boot(container) {
      bootOrder.push("core:boot:start");
      const logger = container.get(Logger);
      const config = container.get(Config);
      logger.log(`Core module booted with env: ${config.env}`);
      await sleep(5);
      bootOrder.push("core:boot:end");
    },
    async dispose(container) {
      disposeOrder.push("core:dispose:start");
      const logger = container.get(Logger);
      logger.log("Core module disposing");
      await sleep(5);
      disposeOrder.push("core:dispose:end");
    },
  };

  // Level 2: Data module (middle level)
  class Database {
    constructor(
      public readonly config: Config,
      public readonly logger: Logger,
    ) {}

    async connect() {
      this.logger.log("Database connecting...");
      await sleep(10);
      this.logger.log("Database connected");
    }

    async disconnect() {
      this.logger.log("Database disconnecting...");
      await sleep(10);
      this.logger.log("Database disconnected");
    }
  }

  class Cache {
    constructor(public readonly logger: Logger) {}
  }

  const dataModule: Module = {
    imports: [coreModule],
    providers: [
      {
        id: Database,
        inject: [Config, Logger],
        useFactory: (config: Config, logger: Logger) => {
          // Sync factory
          return new Database(config, logger);
        },
      },
      {
        id: Cache,
        inject: [Logger],
        useFactory: (logger: Logger) => {
          // Async factory with promise
          return Promise.resolve(new Cache(logger));
        },
      },
      {
        id: "dbConnection",
        useFactory: async () => {
          // Another async factory
          await sleep(15);
          return { host: "localhost", port: 5432 };
        },
      },
    ],
    exports: [Database, Cache, Logger, Config],
    async boot(container) {
      bootOrder.push("data:boot:start");
      const db = container.get(Database);
      await db.connect();
      const cache = container.get(Cache);
      cache.logger.log("Cache initialized");
      await sleep(5);
      bootOrder.push("data:boot:end");
    },
    async dispose(container) {
      disposeOrder.push("data:dispose:start");
      const db = container.get(Database);
      await db.disconnect();
      await sleep(5);
      disposeOrder.push("data:dispose:end");
    },
  };

  // Level 1: Application module (top level)
  class UserService {
    @inject(Database)
    db!: Database;

    @inject(Cache)
    cache!: Cache;

    @inject(Logger)
    logger!: Logger;
  }

  class AuthService {
    @inject(Config)
    config!: Config;

    @inject(Logger)
    logger!: Logger;
  }

  const appModule: Module = {
    imports: [dataModule],
    providers: [
      UserService,
      {
        id: AuthService,
        useFactory: () => {
          // Sync factory
          return new AuthService();
        },
      },
      {
        id: "appVersion",
        useValue: Promise.resolve("1.0.0"), // Async value
      },
      {
        id: "appName",
        useValue: "TestApp", // Sync value
      },
    ],
    exports: [UserService, AuthService, "appVersion", "appName", Logger],
    async boot(container) {
      bootOrder.push("app:boot:start");
      const userService = container.get(UserService);
      const authService = container.get(AuthService);
      const version = container.get<string>("appVersion");
      const name = container.get<string>("appName");

      userService.logger.log(`App ${name} v${version} initialized`);
      authService.logger.log("Auth service ready");

      await sleep(5);
      bootOrder.push("app:boot:end");
    },
    async dispose(container) {
      disposeOrder.push("app:dispose:start");
      const userService = container.get(UserService);
      userService.logger.log("App shutting down");
      await sleep(5);
      disposeOrder.push("app:dispose:end");
    },
  };

  // Create container with 3-level nested modules
  const container = await createContainer(appModule);

  // Verify boot order (should be depth-first: core -> data -> app)
  assertEquals(bootOrder, [
    "core:boot:start",
    "core:boot:end",
    "data:boot:start",
    "data:boot:end",
    "app:boot:start",
    "app:boot:end",
  ]);

  // Verify all services are available and properly injected
  const userService = container.get(UserService);
  const authService = container.get(AuthService);
  const logger = container.get(Logger);

  assertInstanceOf(userService, UserService);
  assertInstanceOf(authService, AuthService);
  assertInstanceOf(userService.db, Database);
  assertInstanceOf(userService.cache, Cache);
  assertInstanceOf(userService.logger, Logger);
  assertInstanceOf(authService.config, Config);
  assertInstanceOf(authService.logger, Logger);

  // Verify all services share the same instances
  assertStrictEquals(userService.logger, logger);
  assertStrictEquals(authService.logger, logger);
  assertStrictEquals(userService.db.logger, logger);
  assertStrictEquals(userService.cache.logger, logger);
  assertStrictEquals(userService.db.config, authService.config);

  // Verify async values resolved correctly
  assertEquals(container.get("appVersion"), "1.0.0");
  assertEquals(container.get("appName"), "TestApp");

  // Verify logger captured all operations
  assertEquals(logger.logs, [
    "Core module booted with env: production",
    "Database connecting...",
    "Database connected",
    "Cache initialized",
    "App TestApp v1.0.0 initialized",
    "Auth service ready",
  ]);

  // Clear logs for dispose phase
  logger.logs.length = 0;

  // Dispose container
  assertEquals(disposeOrder, []);
  await container.dispose();

  // Verify dispose order (should be reverse: app -> data -> core)
  const expectedDisposeOrder = [
    "app:dispose:start",
    "app:dispose:end",
    "data:dispose:start",
    "data:dispose:end",
    "core:dispose:start",
    "core:dispose:end",
  ];
  assertEquals(disposeOrder, expectedDisposeOrder);

  // Verify dispose logs
  assertEquals(logger.logs, [
    "App shutting down",
    "Database disconnecting...",
    "Database disconnected",
    "Core module disposing",
  ]);

  // Multiple dispose calls should only execute once
  await container.dispose();
  await container.dispose();

  // Dispose order should not change
  assertEquals(disposeOrder, expectedDisposeOrder);
});

Deno.test("should share single instance in diamond dependency pattern", async () => {
  const constructorCalls: string[] = [];
  const bootOrder: string[] = [];
  const disposeOrder: string[] = [];

  // Base module - Logger (bottom of diamond)
  class Logger {
    public id = Math.random(); // Unique ID to verify singleton
    public logs: string[] = [];

    constructor() {
      constructorCalls.push("Logger:constructor");
    }

    log(message: string) {
      this.logs.push(message);
    }
  }

  const loggerModule: Module = {
    providers: [
      {
        id: Logger,
        useFactory: () => {
          // Factory to track instantiation
          return new Logger();
        },
      },
      {
        id: "logConfig",
        useValue: Promise.resolve({ level: "info", format: "json" }),
      },
    ],
    exports: [Logger, "logConfig"],
    async boot(container) {
      bootOrder.push("logger:boot:start");
      const logger = container.get(Logger);
      logger.log("Logger module initialized");
      await sleep(10);
      bootOrder.push("logger:boot:end");
    },
    async dispose(container) {
      disposeOrder.push("logger:dispose:start");
      const logger = container.get(Logger);
      logger.log("Logger module disposed");
      await sleep(10);
      disposeOrder.push("logger:dispose:end");
    },
  };

  // Left branch - User module
  class UserService {
    constructor(public logger: Logger) {
      constructorCalls.push("UserService:constructor");
      logger.log("UserService created");
    }

    getUser(id: string) {
      this.logger.log(`Getting user: ${id}`);
      return { id, name: "User" };
    }
  }

  const userModule: Module = {
    imports: [loggerModule],
    providers: [
      {
        id: UserService,
        inject: [Logger],
        useFactory: (logger: Logger) => {
          // Introduce async delay to simulate real-world scenario
          return new Promise<UserService>((resolve) => {
            setTimeout(() => {
              resolve(new UserService(logger));
            }, Math.random() * 20);
          });
        },
      },
      {
        id: "userCount",
        useFactory: async () => {
          await sleep(15);
          return 100;
        },
      },
    ],
    exports: [UserService],
    async boot(container) {
      bootOrder.push("user:boot:start");
      const userService = container.get(UserService);
      const logger = container.get(Logger);
      logger.log("User module initialized");
      userService.getUser("boot-test");
      await sleep(5);
      bootOrder.push("user:boot:end");
    },
    async dispose(container) {
      disposeOrder.push("user:dispose:start");
      const logger = container.get(Logger);
      logger.log("User module disposed");
      await sleep(5);
      disposeOrder.push("user:dispose:end");
    },
  };

  // Right branch - Payment module
  class PaymentService {
    constructor(public logger: Logger, public config: unknown) {
      constructorCalls.push("PaymentService:constructor");
      logger.log(
        `PaymentService created with config: ${JSON.stringify(config)}`,
      );
    }

    processPayment(amount: number) {
      this.logger.log(`Processing payment: $${amount}`);
      return { success: true, amount };
    }
  }

  const paymentModule: Module = {
    imports: [loggerModule],
    providers: [
      {
        id: PaymentService,
        inject: [Logger, "logConfig"],
        useFactory: async (logger: Logger, config: unknown) => {
          // Another async factory with delay
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 20)
          );
          return new PaymentService(logger, config);
        },
      },
      {
        id: "paymentGateway",
        useValue: "stripe",
      },
    ],
    exports: [PaymentService],
    async boot(container) {
      bootOrder.push("payment:boot:start");
      const paymentService = container.get(PaymentService);
      const logger = container.get(Logger);
      logger.log("Payment module initialized");
      paymentService.processPayment(99.99);
      await sleep(5);
      bootOrder.push("payment:boot:end");
    },
    async dispose(container) {
      disposeOrder.push("payment:dispose:start");
      const logger = container.get(Logger);
      logger.log("Payment module disposed");
      await sleep(5);
      disposeOrder.push("payment:dispose:end");
    },
  };

  // Top of diamond - App module
  class OrderService {
    @inject(UserService)
    userService!: UserService;

    @inject(PaymentService)
    paymentService!: PaymentService;

    @inject(Logger)
    logger!: Logger;

    createOrder(userId: string, amount: number) {
      this.logger.log(`Creating order for user ${userId}, amount: $${amount}`);
      const user = this.userService.getUser(userId);
      const payment = this.paymentService.processPayment(amount);
      return { user, payment };
    }
  }

  const appModule: Module = {
    imports: [userModule, paymentModule, loggerModule], // Both import loggerModule transitively
    providers: [
      OrderService,
      {
        id: "appConfig",
        useFactory: async () => {
          await sleep(10);
          return { name: "TestApp", version: "1.0.0" };
        },
      },
    ],
    exports: [OrderService, Logger, UserService, PaymentService],
    async boot(container) {
      bootOrder.push("app:boot:start");
      const orderService = container.get(OrderService);
      const logger = container.get(Logger);
      const config = container.get<{ name: string; version: string }>(
        "appConfig",
      );
      logger.log(`App module initialized: ${config.name} v${config.version}`);
      orderService.createOrder("app-boot", 50);
      await sleep(5);
      bootOrder.push("app:boot:end");
    },
    async dispose(container) {
      disposeOrder.push("app:dispose:start");
      const logger = container.get(Logger);
      logger.log("App module disposed");
      await sleep(5);
      disposeOrder.push("app:dispose:end");
    },
  };

  // Create container with diamond dependency
  const container = await createContainer(appModule);

  // Verify Logger was constructed only once
  assertEquals(
    constructorCalls.filter((c) => c === "Logger:constructor").length,
    1,
  );
  assertEquals(
    constructorCalls.filter((c) => c === "UserService:constructor").length,
    1,
  );
  assertEquals(
    constructorCalls.filter((c) => c === "PaymentService:constructor").length,
    1,
  );

  // Verify boot order (logger should boot only once, before both user and payment)
  assertEquals(bootOrder.filter((c) => !c.startsWith("payment:")), [
    "logger:boot:start",
    "logger:boot:end",
    "user:boot:start",
    "user:boot:end",
    "app:boot:start",
    "app:boot:end",
  ]);
  assertEquals(bootOrder.filter((c) => !c.startsWith("user:")), [
    "logger:boot:start",
    "logger:boot:end",
    "payment:boot:start",
    "payment:boot:end",
    "app:boot:start",
    "app:boot:end",
  ]);

  // Get all services to verify they share the same Logger instance
  const orderService = container.get(OrderService);
  const userService = container.get(UserService);
  const paymentService = container.get(PaymentService);
  const logger = container.get(Logger);

  // Verify all services exist
  assertInstanceOf(orderService, OrderService);
  assertInstanceOf(userService, UserService);
  assertInstanceOf(paymentService, PaymentService);
  assertInstanceOf(logger, Logger);

  // CRITICAL: Verify all modules share the exact same Logger instance
  assertStrictEquals(userService.logger, logger);
  assertStrictEquals(paymentService.logger, logger);
  assertStrictEquals(orderService.logger, logger);
  assertStrictEquals(orderService.userService.logger, logger);
  assertStrictEquals(orderService.paymentService.logger, logger);

  // Verify they all have the same unique ID (additional check for singleton)
  const loggerId = logger.id;
  assertEquals(userService.logger.id, loggerId);
  assertEquals(paymentService.logger.id, loggerId);
  assertEquals(orderService.logger.id, loggerId);

  // Test functionality to ensure shared state
  const logsBefore = logger.logs.length;
  orderService.createOrder("test-user", 100);
  const logsAfter = logger.logs.length;

  // Should have added logs from createOrder -> getUser -> processPayment
  assertEquals(logsAfter - logsBefore, 3); // createOrder, getUser, processPayment

  // Verify all logs are in the same logger instance
  assertEquals(
    logger.logs.includes("Creating order for user test-user, amount: $100"),
    true,
  );
  assertEquals(logger.logs.includes("Getting user: test-user"), true);
  assertEquals(logger.logs.includes("Processing payment: $100"), true);

  // Clear logs for dispose phase
  const totalLogs = logger.logs.length;

  // Dispose container
  await container.dispose();

  // Verify dispose order (should be reverse of boot, logger disposed last)
  assertEquals(disposeOrder.filter((c) => !c.startsWith("payment:")), [
    "app:dispose:start",
    "app:dispose:end",
    "user:dispose:start",
    "user:dispose:end",
    "logger:dispose:start",
    "logger:dispose:end",
  ]);
  assertEquals(disposeOrder.filter((c) => !c.startsWith("user:")), [
    "app:dispose:start",
    "app:dispose:end",
    "payment:dispose:start",
    "payment:dispose:end",
    "logger:dispose:start",
    "logger:dispose:end",
  ]);

  // Verify dispose added logs to the same logger instance
  assertEquals(logger.logs.length > totalLogs, true);
  assertEquals(logger.logs.includes("App module disposed"), true);
  assertEquals(logger.logs.includes("User module disposed"), true);
  assertEquals(logger.logs.includes("Payment module disposed"), true);
  assertEquals(logger.logs.includes("Logger module disposed"), true);

  // Multiple dispose calls should only execute once
  await container.dispose();
  await container.dispose();

  assertEquals(disposeOrder.length, 8);
});
