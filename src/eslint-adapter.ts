import path from "path";
import ts from "typescript";
import { SourceCode, Linter, ESLint } from "eslint";
import { parseForESLint, type ParserOptions } from "@typescript-eslint/parser";

import { InvalidParserError } from "./errors";
import { ConfigProvider } from "./eslint-config-provider";
import { TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE } from "./consts";

export function translateToDiagnosticsFromESLintResult(
  result: Linter.LintMessage[],
  sourceFile: ts.SourceFile,
): ts.Diagnostic[] {
  return result.map(({ message, severity, ruleId, line, column, endLine, endColumn }) => {
    const messageText = `[${ruleId}] ${message}`;

    const category: ts.DiagnosticCategory =
      severity === 2
        ? ts.DiagnosticCategory.Error
        : severity === 1
          ? ts.DiagnosticCategory.Warning
          : ts.DiagnosticCategory.Suggestion;

    /**
     * ESLint uses 1-started index. On the other hand, TypeScript 0-started index.
     * So we should minus from ESLint result's row/column to create TypeScript position.
     */
    const start = ts.getPositionOfLineAndCharacter(sourceFile, line - 1, column - 1);
    const end = endLine && endColumn ? ts.getPositionOfLineAndCharacter(sourceFile, endLine - 1, endColumn - 1) : start;
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

export function isIntersect(
  message: Linter.LintMessage,
  range: { start: number; end: number },
  sourceFile: ts.SourceFile,
) {
  const { line, column, endLine, endColumn } = message;
  const mStart = ts.getPositionOfLineAndCharacter(sourceFile, line - 1, column - 1);
  const mEnd = endLine && endColumn ? ts.getPositionOfLineAndCharacter(sourceFile, endLine - 1, endColumn - 1) : mStart;
  return !(mEnd < range.start || mStart > range.end);
}

export function translateToCodeFixesFromESLintResult(
  result: Linter.LintMessage[],
  fileName: string,
): ts.CodeFixAction[] {
  return result.reduce((acc, { message, ruleId, fix }) => {
    if (!fix) {
      return acc;
    }
    const rid = ruleId || "eslint";
    const rangeStart = fix.range[0];
    const rangeLength = fix.range[1] ? fix.range[1] - fix.range[0] : 0;
    const codeFixAction: ts.CodeFixAction = {
      description: `Fix: ${message}`,
      fixId: rid,
      fixName: rid,
      changes: [
        {
          fileName,
          isNewFile: false,
          textChanges: [
            {
              span: {
                start: rangeStart,
                length: rangeLength,
              },
              newText: fix.text,
            },
          ],
        },
      ],
    };
    return [...acc, codeFixAction];
  }, [] as ts.CodeFixAction[]);
}

export type ESLintAdapterOptions = {
  logger: (msg: string) => void;
  getSourceFile: (fileName: string) => ts.SourceFile | undefined;
  configProvider: ConfigProvider;
};

export class ESLintAdapter {
  private readonly linter: Linter;
  private readonly logger: (msg: string) => void;
  private readonly configProvider: ConfigProvider;
  private readonly getSourceFile: (fileName: string) => ts.SourceFile | undefined;
  private readonly ignoredFilepathMap: Map<string, boolean>;

  public constructor({ logger, configProvider, getSourceFile }: ESLintAdapterOptions) {
    this.linter = new Linter();
    this.logger = logger;
    this.configProvider = configProvider;
    this.getSourceFile = getSourceFile;
    this.ignoredFilepathMap = new Map();
  }

  private convertToESLintSourceCode(src: ts.SourceFile, filename: string, options?: ParserOptions | null) {
    const code = src.getFullText();
    const originalOpt = options ?? {};
    const { ast, scopeManager, services, visitorKeys } = parseForESLint(code, {
      ...originalOpt,
      filePath: filename,
      comment: true,
      loc: true,
      range: true,
      tokens: true,
      warnOnUnsupportedTypeScriptVersion: false,
    });
    const source = new SourceCode({
      text: code,
      ast,
      scopeManager,
      parserServices: services,
      visitorKeys,
    } as unknown as any);
    return source;
  }

  private getESLintResult(fileName: string, sourceFile: ts.SourceFile) {
    if (this.ignoredFilepathMap.get(fileName) === true) return [];
    const configArray = this.configProvider.getConfigArrayForFile(fileName);
    const configFileContent = configArray.extractConfig(fileName).toCompatibleObjectAsConfigFileContent();
    if (!isParserModuleNameValid(configFileContent.parser, path.join("@typescript-eslint", "parser"))) {
      throw new InvalidParserError();
    }
    const parserOptions = (configFileContent.parserOptions ? configFileContent.parserOptions : {}) as ParserOptions;
    const sourceCode = this.convertToESLintSourceCode(sourceFile, fileName, parserOptions);

    // See https://github.com/eslint/eslint/blob/v6.1.0/lib/linter/linter.js#L1130
    return this.linter.verify(sourceCode, configArray as any, { filename: fileName });
  }

  public checkFileToBeIgnored(fileName: string) {
    if (fileName.indexOf("node_modules" + path.sep) !== -1) return;
    if (!fileName.endsWith(".ts") && !fileName.endsWith(".tsx")) return;
    Promise.resolve()
      .then(() => new ESLint())
      .then(eslint => eslint.isPathIgnored(fileName))
      .then(result => this.ignoredFilepathMap.set(fileName, result));
  }

  public getSemanticDiagnostics(
    delegate: ts.LanguageService["getSemanticDiagnostics"],
    fileName: string,
  ): ReturnType<ts.LanguageService["getSemanticDiagnostics"]> {
    const original = delegate(fileName);
    try {
      const sourceFile = this.getSourceFile(fileName);
      if (!sourceFile) {
        return original;
      }
      const eslintResult = this.getESLintResult(fileName, sourceFile);

      return [...original, ...translateToDiagnosticsFromESLintResult(eslintResult, sourceFile)];
    } catch (error) {
      if (error instanceof Error) {
        this.logger(error.message);
        if (error.stack) {
          this.logger(error.stack);
        }
      } else {
        this.logger(`${error}`);
      }
      return original;
    }
  }

  public getCodeFixesAtPosition(
    delegate: ts.LanguageService["getCodeFixesAtPosition"],
    fileName: string,
    start: number,
    end: number,
    errorCodes: number[],
    formatOptions: ts.FormatCodeSettings,
    preferences: ts.UserPreferences,
  ): ReturnType<ts.LanguageService["getCodeFixesAtPosition"]> {
    const original = delegate(fileName, start, end, errorCodes, formatOptions, preferences);
    try {
      if (!errorCodes.includes(TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE)) {
        return original;
      }

      const sourceFile = this.getSourceFile(fileName);
      if (!sourceFile) {
        return original;
      }

      const eslintResult = this.getESLintResult(fileName, sourceFile);

      return [
        ...original,
        ...translateToCodeFixesFromESLintResult(
          eslintResult.filter(r => isIntersect(r, { start, end }, sourceFile)),
          fileName,
        ),
      ];
    } catch (error: any) {
      this.logger(error.message ? error.message : "unknow error");
      return original;
    }
    return original;
  }
}

function isParserModuleNameValid(parserModuleSpecifier: string | undefined, parserModuleName: string) {
  if (!parserModuleSpecifier) return false;
  try {
    const p = require.resolve(parserModuleSpecifier);
    return p.indexOf(parserModuleName) !== -1;
  } catch (e) {
    return false;
  }
}
