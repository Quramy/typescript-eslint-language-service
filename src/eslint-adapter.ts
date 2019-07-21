import * as ts from "typescript";
import { Linter } from "eslint";
import { AstConverter } from "./ast-converter";

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
  linter: Linter;
  logger: (msg: string) => void;
  converter: AstConverter;
  getSourceFile: (fileName: string) => ts.SourceFile | undefined;

  constructor({
    logger,
    converter,
    getSourceFile,
  }: ESLintAdapterOptions) {
    this.linter = new Linter();
    this.logger = logger;
    this.converter = converter;
    this.getSourceFile = getSourceFile;
  }

  getLinterConfig(): Linter.Config {
    // TODO Create from ESLint config from CLIEngine
    return {
      rules: {
        semi: 2,
      },
    };
  }

  getSemanticDiagnostics(delegate: ts.LanguageService["getSemanticDiagnostics"], fileName: string): ReturnType<ts.LanguageService["getSemanticDiagnostics"]> {
    const original = delegate(fileName);
    try {
      const sourceFile = this.getSourceFile(fileName);
      if (!sourceFile) {
        return original;
      }
      const parserOptions = { }; // TODO
      const sourceCode = this.converter.convertToESLintSourceCode(sourceFile, parserOptions);
      const config = this.getLinterConfig();
      const eslintResult = this.linter.verify(sourceCode, config, { filename: fileName });
      return [...original, ...translateESLintResult(eslintResult, sourceFile)];
    } catch (error) {
      this.logger(error.message ? error.message : "unknow error");
      return original;
    }
  }
}
