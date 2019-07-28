export class InvalidParserError extends Error {
  public constructor() {
    super("use '@typescript-eslint/parser'");
  }
}
