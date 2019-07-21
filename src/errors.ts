export class InvalidParserError extends Error {
  constructor() {
    super("use '@typescript-eslint/parse'");
  }
}
