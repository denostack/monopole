import {
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.92.0/testing/asserts.ts";

import { Container } from "./container.ts";
import { Inject } from "./decorator.ts";
import { UndefinedError } from "./error.ts";

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

  assertThrows(
    () => container.delete("instance"),
    Error,
    '"instance" is already frozen.',
  );
  assertThrows(
    () => container.delete("resolver"),
    Error,
    '"resolver" is already frozen.',
  );
  assertThrows(
    () => container.delete("driver1"),
    Error,
    '"driver1" is already frozen.',
  );
  assertThrows(
    () => container.delete(Driver2),
    Error,
    "Driver2 is already frozen.",
  );
  assertThrows(
    () => container.delete("alias"),
    Error,
    '"alias" is already frozen.',
  );
});

Deno.test("undefined error", () => {
  const container = new Container();

  assertThrows(
    () => container.get("undefined"),
    UndefinedError,
    '"undefined" is not defined!',
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
