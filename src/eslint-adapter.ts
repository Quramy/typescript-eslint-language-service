import * as ts from "typescript";
import { Linter } from "eslint";
import { AstConverter } from "./ast-converter";
import { InvalidParserError } from "./errors";
import { ESLintConfigProvider } from "./eslint-config-provider";

// TODO refactor global const
export const TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE = 30010;

export function translateESLintResult(result: Linter.LintMessage[], sourceFile: ts.SourceFile): ts.Diagnostic[] {
  return result.map(({ message, severity, ruleId, line, column, endLine, endColumn })=> {
    const messageText = `[${ruleId}] ${message}`;

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
      code: TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE,
      messageText,
      start,
      length,
    };

    return diagnostic;
  });
}

export type ESLintAdapterOptions = {
  logger: (msg: string) => void;
  getSourceFile: (fileName: string) => ts.SourceFile | undefined;
  converter: AstConverter;
  configProvider: ESLintConfigProvider;
};

export class ESLintAdapter {
  linter: Linter;
  logger: (msg: string) => void;
  converter: AstConverter;
  configProvider: ESLintConfigProvider;
  getSourceFile: (fileName: string) => ts.SourceFile | undefined;

  constructor({
    logger,
    converter,
    configProvider,
    getSourceFile,
  }: ESLintAdapterOptions) {
    this.linter = new Linter();
    this.logger = logger;
    this.converter = converter;
    this.configProvider = configProvider;
    this.getSourceFile = getSourceFile;
  }

  getSemanticDiagnostics(delegate: ts.LanguageService["getSemanticDiagnostics"], fileName: string): ReturnType<ts.LanguageService["getSemanticDiagnostics"]> {
    const original = delegate(fileName);
    try {
      const sourceFile = this.getSourceFile(fileName);
      if (!sourceFile) {
        return original;
      }
      const configArray = this.configProvider.getConfigArrayForFile(fileName);
      const configFileContent = configArray.extractConfig(fileName).toCompatibleObjectAsConfigFileContent();
      if (!configFileContent.parser || !/@typescript-eslint\/parser/.test(configFileContent.parser)) {
        throw new InvalidParserError();
      }
      const parserOptions = configFileContent.parserOptions ? configFileContent.parserOptions : { };
      const sourceCode = this.converter.convertToESLintSourceCode(sourceFile, parserOptions);

      // See https://github.com/eslint/eslint/blob/v6.1.0/lib/linter/linter.js#L1130
      const eslintResult = this.linter.verify(sourceCode, configArray as any, { filename: fileName });

      return [...original, ...translateESLintResult(eslintResult, sourceFile)];
    } catch (error) {
      this.logger(error.message ? error.message : "unknow error");
      return original;
    }
  }
}
