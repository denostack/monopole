# monopole

<a href="https://github.com/denostack"><img src="https://raw.githubusercontent.com/denostack/images/main/logo.svg" width="240" /></a>

<p>
  <a href="https://github.com/denostack/monopole/actions"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/denostack/monopole/ci.yml?branch=main&logo=github&style=flat-square" /></a>
  <a href="https://codecov.io/gh/denostack/monopole"><img alt="Coverage" src="https://img.shields.io/codecov/c/gh/denostack/monopole?style=flat-square" /></a>
  <img alt="License" src="https://img.shields.io/npm/l/monopole.svg?style=flat-square" />
  <img alt="Language Typescript" src="https://img.shields.io/badge/language-Typescript-007acc.svg?style=flat-square" />
  <br />
  <a href="https://deno.land/x/monopole"><img alt="deno.land/x/monopole" src="https://img.shields.io/badge/dynamic/json?url=https://api.github.com/repos/denostack/monopole/tags&query=$[0].name&display_name=tag&label=deno.land/x/monopole@&style=flat-square&logo=deno&labelColor=000&color=777" /></a>
  <a href="https://www.npmjs.com/package/monopole"><img alt="Version" src="https://img.shields.io/npm/v/monopole.svg?style=flat-square&logo=npm" /></a>
  <a href="https://npmcharts.com/compare/monopole?minimal=true"><img alt="Downloads" src="https://img.shields.io/npm/dt/monopole.svg?style=flat-square" /></a>
</p>

This library provides a powerful and flexible dependency injection container for
Deno applications. It allows you to easily manage your application's
dependencies and their lifetimes. The library offers a variety of features,
including value bindings, resolvers, aliases, and support for different
lifetimes (singleton, transient, and scoped).

## Features

- Value bindings (also support async)
- Resolver bindings (also support async)
- Class bindings
- Alias bindings
- Inject decorator for resolving dependencies
- Circular dependency resolution (even self dependency!)
- Support for **singleton**, **transient**, and **scoped** lifetimes
- Module

## Usage

### with Deno

```ts
import { createContainer } from "https://deno.land/x/monopole/mod.ts";

const container = createContainer();
```

### with Node.js & Browser

**Install**

```bash
npm install monopole
```

```ts
import { createContainer } from "monopole";

// Usage is as above :-)
```

### Value bindings

Value bindings allow you to bind a value directly to a specific key. This is
useful when you want to store configuration values, pre-built instances, or
other simple values in the container.

Example:

```ts
const container = createContainer();
container.value("message", "hello world!");
container.value("instance", Promise.resolve({ name: "instance" }));

const message = await container.resolve("message");
const instance = await container.resolve("instance");

console.log(message); // "hello world!"
console.log(instance); // { name: "instance" }
```

### Resolver bindings

Resolver bindings allow you to provide a factory function that will be invoked
when the dependency is resolved. This is useful when you want to create an
instance of a class, build an object or return a value based on runtime
information.

Example:

```ts
const container = createContainer();

container.resolver("resolver", () => ({ message: "this is resolver" }));
container.resolver("asyncResolver", async () => {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ message: "this is async resolver" }), 50)
  );
});

const resolver = await container.resolve("resolver");
const asyncResolver = await container.resolve("asyncResolver");

console.log(resolver); // { message: "this is resolver" }
console.log(asyncResolver); // { message: "this is async resolver" }
```

### Class bindings

Class bindings allow you to bind a class constructor to a specific key. When the
key is resolved, a new instance of the class will be created.

Example:

```ts
class BaseClass {
}

class MyClass extends BaseClass {
  constructor() {
    this.message = "hello world!";
  }
}

const container = createContainer();
container.bind(BaseClass, MyClass);

const instance = await container.resolve(BaseClass);

console.log(instance.message); // "hello world!"
```

### Alias bindings

Alias bindings allow you to bind one key to another key, effectively creating an
alias for a value in the container.

Example:

```ts
const container = createContainer();

container.value("original", "this is the original value");
container.alias("alias", "original");

const original = await container.resolve("original");
const alias = await container.resolve("alias");

console.log(original); // "this is the original value"
console.log(alias); // "this is the original value"
```

### Inject decorator for resolving dependencies

The `@Inject` decorator is a convenient way to resolve dependencies and inject
them into a class. This decorator makes it easy to specify which dependencies a
class requires, while the dependency injection library takes care of the
underlying instantiation and management of the dependencies.

In the provided example code, a test demonstrates how to use the `@Inject`
decorator to resolve a dependency for the `Controller` class:

```ts
class Connection {
}

class Controller {
  @Inject("connection")
  public connection!: Connection;
}

container.bind("connection", Connection);
container.bind(Controller);

const controller = await container.resolve(Controller);

controller.connection instanceof Connection; // true
```

### Circular dependency resolution

Circular dependency resolution Circular dependency resolution is a feature of
the dependency injection library that allows you to handle cases where two or
more classes depend on each other. This feature is useful in scenarios where
classes have a mutual relationship, such as parent-child or sibling
relationships. The library can resolve these circular dependencies
automatically, ensuring that the correct instances are injected into the
appropriate classes.

In the example test code provided, a circular dependency is created between the
`Parent` and `Child` classes. Each class has an `@Inject` decorator on a
property, indicating that it should be injected with an instance of the other
class:

```ts
const container = createContainer();

class Parent {
  @Inject("child")
  public child!: Child;
}

class Child {
  @Inject("parent")
  public parent!: Parent;
}

container.bind("parent", Parent);
container.bind("child", Child);

// assert
const parent = await container.resolve<Parent>("parent");
const child = await container.resolve<Child>("child");

console.log(parent.child === child); // true
console.log(child.parent === parent); // true
```

### Support for singleton, transient, and scoped lifetimes

The container supports different lifetimes for bindings:

- **Singleton**: The instance will be created once and reused for all subsequent
  resolutions.
- **Transient**: A new instance will be created for each resolution.
- **Scoped**: The instance will be created once per scope.

Example:

```ts
class SingletonClass {}
class TransientClass {}
class ScopedClass {}

const container = createContainer();

container.bind(SingletonClass).lifetime(Lifetime.Singleton);
container.bind(TransientClass).lifetime(Lifetime.Transient);
container.bind(ScopedClass).lifetime(Lifetime.Scoped);

// Singleton example
const singleton1 = await container.resolve(SingletonClass);
const singleton2 = await container.resolve(SingletonClass);
console.log(singleton1 === singleton2); // true

// Transient example
const transient1 = await container.resolve(TransientClass);
const transient2 = await container.resolve(TransientClass);
console.log(transient1 === transient2); // false

// Scoped example
const scopedContainer = await container.scope();
const scoped1 = await scopedContainer.resolve(ScopedClass);
const scoped2 = await scopedContainer.resolve(ScopedClass);
console.log(scoped1 === scoped2); // true
```

### Module

Modules offer a convenient way to organize and manage dependencies in your
application. By separating concerns, they help make your code more modular and
maintainable.

In the following example, a `ConnectionModule` is created that provides a
`Connection` class and handles connecting and closing the connection during the
boot and close phases of the application lifecycle.

```ts
class Connection {
  connect(): Promise<void>;
  close(): Promise<void>;
}

class ConnectionModule implements Module {
  provide(container: ModuleDescriptor) {
    container.bind(Connection);
  }

  async boot(container: ModuleDescriptor) {
    const connection = await container.resolve(Connection);
    await connection.connect();
  }

  async close(container: ModuleDescriptor) {
    const connection = await container.resolve(Connection);
    await connection.close();
  }
}

const container = createContainer();

container.register(new ConnectionModule());

await container.boot();

/* ... */

// When the application is shutting down
await container.close();
```

To use a module, simply create a new instance of it and register it with the
container using the `register` method. The module's `provide`, `boot`, and
`close` methods will be called automatically during the container's lifecycle.

## Example

- [Deno Web Server Example](./example/deno-http-server) Set up and run a web
  application using DI with modular architecture.
