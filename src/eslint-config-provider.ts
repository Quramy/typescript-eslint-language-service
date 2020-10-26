import path from "path";
import ts from "typescript";
import type { ConfigArray } from "@eslint/eslintrc/lib/config-array/config-array";
import type { CascadingConfigArrayFactory } from "@eslint/eslintrc/lib/cascading-config-array-factory";

let _configArrayFactory: typeof CascadingConfigArrayFactory;
function getFactroyClass() {
  if (_configArrayFactory) return _configArrayFactory;
  try {
    // for ESLint >= v7.12.0
    const p = require.resolve("@eslint/eslintrc/lib/cascading-config-array-factory");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _configArrayFactory = require(p).CascadingConfigArrayFactory;
    return _configArrayFactory;
  } catch {
    // for ESLint < v7.12.0
    const p = require.resolve("eslint/lib/cli-engine/cascading-config-array-factory");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _configArrayFactory = require(p).CascadingConfigArrayFactory;
    return _configArrayFactory;
  }
}

export type ConfigProviderHost = {
  readonly readFile: (fileName: string, encoding: string) => string | undefined;
  readonly watchFile: (path: string, callback: ts.FileWatcherCallback, pollingInterval?: number) => ts.FileWatcher;
};

export type ESLintConfigProviderOptions = {
  host: ConfigProviderHost;
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

  public constructor({ host, directoriesToWatch }: ESLintConfigProviderOptions) {
    this.host = host;
    this.factory = new (getFactroyClass())();

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
}
