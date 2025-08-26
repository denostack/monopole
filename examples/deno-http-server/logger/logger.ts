export abstract class Logger {
  abstract info(...data: unknown[]): void;
  abstract error(...data: unknown[]): void;
}
