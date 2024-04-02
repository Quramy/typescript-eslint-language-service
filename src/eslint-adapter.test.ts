import path from "path";
import ts from "typescript";
import extract from "fretted-strings";
import { ESLintAdapter } from "./eslint-adapter";
import { ConfigProvider } from "./eslint-config-provider";
import { Legacy } from "@eslint/eslintrc";
import type { ConfigArray } from "@eslint/eslintrc";
import { TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE } from "./consts";

class TestingConfigProvider implements ConfigProvider {
  public conf: any = {
    parser: new Legacy.ConfigDependency({
      definition: require("@typescript-eslint/parser"),
      error: null,
      id: "@typescript-eslint/parser",
      filePath: path.resolve(__dirname, "../node_modules/@typescript-eslint/parser/dist/parser.js"),
    }),
    parserOptions: { ecmaVersion: "latest" },
  };
  public getConfigArrayForFile(): ConfigArray {
    return new Legacy.ConfigArray(this.conf);
  }
}

// `diagnostic.file` is so noisy for snapshot test
function filterSourceFileFromDiagnosticList(diagnostics: ts.Diagnostic[]) {
  return diagnostics.map(d => {
    delete d.file;
    return d;
  });
}

describe("ESLintAdapter", () => {
  describe("#getSemanticDiagnostics", () => {
    it("shuld return ESLint verification result as TypeScript diagnostic format", () => {
      const configProvider = new TestingConfigProvider();
      configProvider.conf.rules = {
        semi: 2,
      };
      const adapter = new ESLintAdapter({
        getSourceFile: () => ts.createSourceFile("main.ts", "const x = 1", ts.ScriptTarget.ESNext, true),
        configProvider,
        logger: () => {},
      });
      const diagnostics = filterSourceFileFromDiagnosticList(adapter.getSemanticDiagnostics(() => [], "main.ts"));
      expect(diagnostics).toMatchSnapshot();
    });
  });

  describe("#getCodeFixesAtPosition", () => {
    it("shuld only delegate when input errorCodes does not include TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE", () => {
      const configProvider = new TestingConfigProvider();
      configProvider.conf.rules = {
        quotes: [2, "double"],
      };
      const [content, frets] = extract(
        `
          'use strict';     
     %%%  ^           ^   %%%
     %%%  p1          p2  %%%
        `,
      );
      const adapter = new ESLintAdapter({
        getSourceFile: () => ts.createSourceFile("main.ts", content, ts.ScriptTarget.ESNext, true),
        configProvider,
        logger: () => {},
      });
      const codeFixes = adapter.getCodeFixesAtPosition(() => [], "main.ts", frets.p1.pos, frets.p2.pos, [], {}, {});
      expect(codeFixes).toMatchSnapshot();
    });

    it("shuld only delegate when input range isn't intersected ESLint reported results", () => {
      const configProvider = new TestingConfigProvider();
      configProvider.conf.rules = {
        quotes: [2, "double"],
      };
      const [content, frets] = extract(
        `
          'use strict';     

          const hoge = 1;
     %%%  ^             ^   %%%
     %%%  p1            p2  %%%
        `,
      );
      const adapter = new ESLintAdapter({
        getSourceFile: () => ts.createSourceFile("main.ts", content, ts.ScriptTarget.ESNext, true),
        configProvider,
        logger: () => {},
      });
      const codeFixes = adapter.getCodeFixesAtPosition(
        () => [],
        "main.ts",
        frets.p1.pos,
        frets.p2.pos,
        [TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE],
        {},
        {},
      );
      expect(codeFixes).toMatchSnapshot();
    });

    it("shuld return ESLint sourceCodeFixer result as TypeScript codeFixAction format", () => {
      const configProvider = new TestingConfigProvider();
      configProvider.conf.rules = {
        quotes: [2, "double"],
      };
      const [content, frets] = extract(
        `
          'use strict';     
     %%%  ^           ^   %%%
     %%%  p1          p2  %%%
        `,
      );
      const adapter = new ESLintAdapter({
        getSourceFile: () => ts.createSourceFile("main.ts", content, ts.ScriptTarget.ESNext, true),
        configProvider,
        logger: () => {},
      });
      const codeFixes = adapter.getCodeFixesAtPosition(
        () => [],
        "main.ts",
        frets.p1.pos,
        frets.p2.pos,
        [TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE],
        {},
        {},
      );
      expect(codeFixes).toMatchSnapshot();
    });
  });
});
