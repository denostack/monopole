# 🦕🥞 Container

Super slim DI(Depdency Injection) container.

## Features

- DI Container
- Type Perfect
- No Depdendencies (even reflect_metadata!)
- Circular Dependency (even self dependency!)
- Service Provider

## Getting started

```javascript
import { container } from "https://deno.land/x/container/mod.ts";
```

or

```javascript
import { Container } from "https://deno.land/x/container/mod.ts";

const container = new Container(); // create new one
```

### Bind value

```ts
// define
container.instance("instance", { message: "this is instance" });

// use
container.get<{ message: string }>("instance"); // { message: 'this is instance' }
```

### Bind resolver

```ts
// define
container.resolver("resolver", () => {
  return { message: "this is resolver" };
});

// use

container.get<{ message: string }>("resolver"); // { message: 'this is resolver' }
```

### Bind class

```ts
// define
class Database {
}

class Connection {
  @Inject("database")
  database!: Database;
}

container.bind("database", Database);
container.bind(Connection); // If the name and class are the same, you only need to define the class.

// use

const connection = container.get(Connection);

console.log(connection); // Connection { database: Database {} }
console.log(connection.database); // Database {}
```

### Factory

```ts
class Controller {
  @Inject(Connection)
  connection!: Connection;
}

// without define

container.create(Controller); // Controller { connection: Connection {} }
```

### Service Provider

```ts
export class DatabaseProvider implements Provider {
  register(app: ProviderDescriptor) {
    const DB_HOST = Deno.env.get("DB_HOST") ?? "localhost";
    const DB_DATABASE = Deno.env.get("DB_DATABASE") ?? "test";
    const DB_USERNAME = Deno.env.get("DB_USERNAME") ?? "root";
    const DB_PASSWORD = Deno.env.get("DB_PASSWORD") ?? "root";

    app.resolver("database", () => {
      return new MySQLDatabase({
        host: DB_HOST,
        database: DB_DATABASE,
        username: DB_USERNAME,
        password: DB_PASSWORD,
      });
    });
    app.bind(Connection);
  }

  close(app: ProviderDescriptor) {
    const connection = app.get(Connection);
    connection.close();
  }
}
```

controller

```ts
export class UserController {
  @Inject(Connection)
  connection!: Connection;

  @Inject(Connection, (conn) => conn.getRepository(User))
  repoUsers!: Repository<User>;
}
```

`entry.ts`

```ts
container.register(new DatabaseProvider());

container.boot();

const controller = container.create(UserController);

container.close();
```
