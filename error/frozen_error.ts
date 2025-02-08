import { type ServiceIdentifier, toString } from "../service_identifier.ts";

export class FrozenError extends Error {
  constructor(
    public id: ServiceIdentifier<unknown>,
  ) {
    super(`${toString(id)} is already frozen.`);
    this.name = "FrozenError";
  }
}
