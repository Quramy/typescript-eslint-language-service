import path from "path";
import ts from "typescript";
import { Legacy } from "@eslint/eslintrc";
import type { ConfigArray, CascadingConfigArrayFactory } from "@eslint/eslintrc";

function getFactroyClass() {
  return Legacy.CascadingConfigArrayFactory;
}

export type ConfigProviderHost = {
  readonly readFile: (fileName: string, encoding: string) => string | undefined;
  readonly watchFile: (path: string, callback: ts.FileWatcherCallback, pollingInterval?: number) => ts.FileWatcher;
};

export type ESLintConfigProviderOptions = {
  host: ConfigProviderHost;
  log?: (msg: string) => void;
  directoriesToWatch: string[];
};

const ESLINTRC_SUFFIX_LIST = [
  ".eslintrc.js",
  ".eslintrc.yaml",
  ".eslintrc.yml",
  ".eslintrc.json",
  ".eslintrc",
  "package.json",
];

export interface ConfigProvider {
  getConfigArrayForFile(fileName: string): ConfigArray;
}

export class ESLintConfigProvider implements ConfigProvider {
  private readonly host: ConfigProviderHost;
  private readonly factory: CascadingConfigArrayFactory;
  private readonly log: (msg: string) => void;

  public constructor({ host, log = () => {}, directoriesToWatch }: ESLintConfigProviderOptions) {
    this.host = host;
    this.log = log;
    const eslintRecommendedPath = this.resolveESLintIntrinsicConfigPath("eslint-recommended");
    const eslintAllPath = this.resolveESLintIntrinsicConfigPath("eslint-all");

    //
    // It requires the ESLint intrinsic configuration js file path when user config has "eslint:recommended" or "eslint:all" such as:
    //
    // ```yaml
    // extends:
    //   - "eslint:recommended"
    // ```
    //
    this.factory = new (getFactroyClass())({
      eslintAllPath,
      eslintRecommendedPath,
    });

    directoriesToWatch.forEach(directory => {
      ESLINTRC_SUFFIX_LIST.map(suffix => path.resolve(directory, suffix)).forEach(eslintrcFilepath => {
        this.host.watchFile(eslintrcFilepath, () => this.factory.clearCache(), 50);
      });
    });
  }

  public getConfigArrayForFile(fileName: string) {
    return this.factory.getConfigArrayForFile(fileName);
  }

  public getConfigForFile(fileName: string) {
    return this.factory.getConfigArrayForFile(fileName).extractConfig(fileName);
  }

  private resolveESLintIntrinsicConfigPath(name: "eslint-all" | "eslint-recommended") {
    let ret: string | undefined = undefined;
    try {
      const fragments = require.resolve("eslint").split("node_modules/eslint");
      ret = [...fragments.slice(0, fragments.length - 1), `/conf/${name}.js`].join("node_modules/eslint");
    } catch (e: any) {
      this.log(e);
    }
    return ret;
  }
}
