import path from "path";
import ts from "typescript";
import { AstConverter } from "./ast-converter";
import { ESLintAdapter } from "./eslint-adapter";
import { ConfigProvider } from "./eslint-config-provider";
import { ConfigArray } from "eslint/lib/cli-engine/config-array/config-array";

class TestingConfigProvider implements ConfigProvider {
  public conf: any = {
    parser: {
      error: null,
      id: "@typescript-eslint/parser",
      filePath: path.resolve(__dirname, "../node_modules/@typescript-eslint/parser/dist/parser.js"),
    },
  };
  public getConfigArrayForFile(): ConfigArray {
    return new ConfigArray(this.conf);
  }
}

function filterDiag(diagnostics: ts.Diagnostic[]) {
  // eslint-disable-next-line
  return diagnostics.map(({ file, ...rest }: ts.Diagnostic) => ({ ...rest }));
}

describe("ESLintAdapter", () => {
  describe("#getSemanticDiagnostics", () => {
    it("shuld return ESLint verification result as TypeScript diagnostic format", () => {
      const configProvider = new TestingConfigProvider();
      configProvider.conf.rules = {
        semi: 2,
      };
      const adapter = new ESLintAdapter({
        converter: new AstConverter(),
        getSourceFile: () => ts.createSourceFile("main.ts", "const x = 1", ts.ScriptTarget.ESNext, true),
        configProvider,
        logger: () => { },
      });
      const diagnostics = filterDiag(adapter.getSemanticDiagnostics(() => [], "main.ts"));
      expect(diagnostics).toMatchSnapshot();
    });
  });
});
