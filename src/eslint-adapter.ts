import * as ts from "typescript";
import { Linter, CLIEngine } from "eslint";
import { AstConverter } from "./ast-converter";
import { InvalidParserError } from "./errors";

export function translateESLintResult(result: Linter.LintMessage[], sourceFile: ts.SourceFile): ts.Diagnostic[] {
  return result.map(message => {
    const { message: messageText, severity, ruleId, line, column, endLine, endColumn } = message;

    const category: ts.DiagnosticCategory = 
      severity === 2 ? ts.DiagnosticCategory.Error :
      severity === 1 ? ts.DiagnosticCategory.Warning :
      ts.DiagnosticCategory.Suggestion;

    /**
     * ESLint uses 1-started index. On the other hand, TypeScript 0-started index.
     * So we should minus from ESLint result's row/column to create TypeScript position.
     */
    const start = ts.getPositionOfLineAndCharacter(sourceFile, line - 1, column - 1);
    const end = endLine && endColumn ? ts.getPositionOfLineAndCharacter(sourceFile, endLine - 1, endColumn -1) : start;
    const length = Math.max(0, end - start);

    const diagnostic: ts.Diagnostic = {
      file: sourceFile,
      category,
      code: 99999, // TODO retrieve from ruleId
      messageText,
      start,
      length,
    };

    return diagnostic;
  });
}

export type ESLintAdapterOptions = {
  logger: (msg: string) => void,
  getSourceFile: (fileName: string) => ts.SourceFile | undefined,
  converter: AstConverter,
};

export class ESLintAdapter {
  readonly cliEngine: CLIEngine;
  readonly linter: Linter;
  logger: (msg: string) => void;
  converter: AstConverter;
  getSourceFile: (fileName: string) => ts.SourceFile | undefined;

  constructor({
    logger,
    converter,
    getSourceFile,
  }: ESLintAdapterOptions) {
    this.cliEngine = new CLIEngine({
      useEslintrc: true,
    });
    this.linter = new Linter();
    this.logger = logger;
    this.converter = converter;
    this.getSourceFile = getSourceFile;
  }

  getLinterConfig(fileName: string): Linter.Config {
    const config = this.cliEngine.getConfigForFile(fileName);
    if (!config.parser || !/@typescript-eslint\/parser/.test(config.parser)) {
      throw new InvalidParserError();
    }
    return config;
  }

  getSemanticDiagnostics(delegate: ts.LanguageService["getSemanticDiagnostics"], fileName: string): ReturnType<ts.LanguageService["getSemanticDiagnostics"]> {
    const original = delegate(fileName);
    try {
      const sourceFile = this.getSourceFile(fileName);
      if (!sourceFile) {
        return original;
      }
      const config = this.getLinterConfig(fileName);
      const parserOptions = config.parserOptions ? config.parserOptions : { };
      const sourceCode = this.converter.convertToESLintSourceCode(sourceFile, parserOptions);
      const { env, rules, globals, settings } = config;
      this.logger(JSON.stringify(rules));
      const eslintResult = this.linter.verify(sourceCode, {
        env,
        rules,
        globals,
        settings,
      }, { filename: fileName });
      return [...original, ...translateESLintResult(eslintResult, sourceFile)];
    } catch (error) {
      this.logger(error.message ? error.message : "unknow error");
      return original;
    }
  }
}
