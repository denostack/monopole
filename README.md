# monopole <a href="https://github.com/denostack"><img src="https://raw.githubusercontent.com/denostack/images/main/logo.svg" width="160" align="right" /></a>

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

A powerful and flexible dependency injection container for TypeScript/JavaScript applications. Monopole provides a modern, module-based approach to dependency injection with support for async resolution, property injection using TC39 Stage 3 decorators, and comprehensive lifecycle management.

## Features

- **Module-based architecture** - Organize dependencies with modules that support imports/exports
- **Multiple provider types** - Class, value, factory, and existing providers
- **Property injection** - Using TC39 Stage 3 decorators (`@inject`)
- **Async resolution** - Full support for async providers and initialization
- **Circular dependency support** - Automatic resolution of circular dependencies
- **Lifecycle management** - Module boot and dispose hooks
- **TypeScript first** - Full TypeScript support with type inference
- **Framework agnostic** - Works with Deno, Node.js, and browsers

## Installation

### Deno

```ts
import { createContainer } from "https://deno.land/x/monopole/mod.ts";
```

### Node.js & Browser

```bash
npm install monopole
```

```ts
import { createContainer } from "monopole";
```

## Quick Start

```ts
import { createContainer, inject, type Module } from "monopole";

// Define services
class Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

class UserService {
  @inject(Logger)
  logger!: Logger;

  getUser(id: string) {
    this.logger.log(`Fetching user ${id}`);
    return { id, name: "John Doe" };
  }
}

// Create a module
const appModule: Module = {
  providers: [
    Logger,
    UserService,
  ],
  exports: [UserService],
};

// Create and use container
const container = await createContainer(appModule);
const userService = container.get(UserService);
userService.getUser("123");
```

## Core Concepts

### Modules

Modules are the building blocks of your application. They encapsulate providers and can import other modules to compose your dependency graph.

```ts
import type { Container, Module } from "monopole";

const databaseModule: Module = {
  providers: [
    { id: "dbConfig", useValue: { host: "localhost", port: 5432 } },
    {
      id: DatabaseConnection,
      useFactory: async (config) => {
        const conn = new DatabaseConnection(config);
        await conn.connect();
        return conn;
      },
      inject: ["dbConfig"],
    },
  ],
  exports: [DatabaseConnection],
  async dispose(container: Container) {
    const conn = container.get(DatabaseConnection);
    await conn.disconnect();
  },
};

const appModule: Module = {
  imports: [databaseModule],
  providers: [UserRepository],
  exports: [UserRepository],
};
```

### Providers

Monopole supports four types of providers:

#### Class Provider

```ts
// Direct class registration
providers: [MyService]

// With explicit ID
providers: [{
  id: "myService",
  useClass: MyService,
}]
```

#### Value Provider

```ts
providers: [
  { id: "apiUrl", useValue: "https://api.example.com" },
  { id: "config", useValue: Promise.resolve({ key: "value" }) },
]
```

#### Factory Provider

```ts
providers: [{
  id: HttpClient,
  useFactory: (apiUrl: string) => new HttpClient(apiUrl),
  inject: ["apiUrl"],
}]
```

#### Existing Provider (Alias)

```ts
providers: [
  { id: Logger, useClass: ConsoleLogger },
  { id: "logger", useExisting: Logger },
]
```

### Property Injection

Use the `@inject` decorator with TC39 Stage 3 decorator syntax:

```ts
import { inject } from "monopole";

class OrderService {
  @inject(Logger)
  logger!: Logger;

  @inject(DatabaseConnection)
  db!: DatabaseConnection;

  @inject("config")
  config!: Config;

  // With transformation
  @inject(UserService, (service) => service.getUser.bind(service))
  getUser!: (id: string) => User;
}
```

### Optional Dependencies

Factory providers can specify optional dependencies:

```ts
providers: [{
  id: Service,
  useFactory: (required, optional) => {
    return new Service(required, optional ?? defaultValue);
  },
  inject: [
    RequiredDep,
    [OptionalDep, true], // true marks it as optional
  ],
}]
```

## Advanced Usage

### Circular Dependencies

Monopole automatically handles circular dependencies:

```ts
class Parent {
  @inject(Child)
  child!: Child;
}

class Child {
  @inject(Parent)
  parent!: Parent;
}

const module: Module = {
  providers: [Parent, Child],
  exports: [Parent, Child],
};

const container = await createContainer(module);
const parent = container.get(Parent);
const child = container.get(Child);

console.log(parent.child === child); // true
console.log(child.parent === parent); // true
```

### Module Composition

Compose complex applications from smaller modules:

```ts
// Feature modules
const authModule: Module = {
  providers: [AuthService, JwtService],
  exports: [AuthService],
};

const dataModule: Module = {
  providers: [Database, UserRepository],
  exports: [UserRepository],
};

// Application module
const appModule: Module = {
  imports: [authModule, dataModule],
  providers: [
    {
      id: AppService,
      useFactory: (auth, repo) => new AppService(auth, repo),
      inject: [AuthService, UserRepository],
    },
  ],
  exports: [AppService],
  async boot(container) {
    // Initialize application
    const app = container.get(AppService);
    await app.initialize();
  },
  async dispose(container) {
    // Cleanup
    const app = container.get(AppService);
    await app.shutdown();
  },
};

// Create application
const container = await createContainer(appModule);
const app = container.get(AppService);
```

### Async Disposal

Containers support the async disposal pattern:

```ts
// Using async disposal
await using container = await createContainer(appModule);
// Container will be automatically disposed when going out of scope

// Manual disposal
const container = await createContainer(appModule);
try {
  // Use container
} finally {
  await container.dispose();
}
```

## Examples

- [Deno HTTP Server](./examples/deno-http-server) - Web application with modular architecture

## API Reference

### `createContainer(module: Module): Promise<Container>`

Creates a new container from a module definition.

### `Container`

- `get<T>(id: ServiceIdentifier<T>): T` - Get a resolved instance
- `has(id: ServiceIdentifier): boolean` - Check if a service exists
- `entries(): IterableIterator<[ServiceIdentifier, unknown]>` - Get all entries
- `dispose(): Promise<void>` - Dispose the container and all modules

### `Module`

- `imports?: Module[]` - Modules to import
- `providers?: Provider[]` - Service providers
- `exports?: ServiceIdentifier[]` - Exported service identifiers
- `boot?(container: Container): MaybePromise<void>` - Initialization hook
- `dispose?(container: Container): MaybePromise<void>` - Cleanup hook

### `@inject(id: ServiceIdentifier, transformer?: (instance: T) => any)`

Property decorator for dependency injection.

## License

MIT
