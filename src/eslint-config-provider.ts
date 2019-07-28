import path from "path";
import ts from "typescript";
import { ConfigArray } from "eslint/lib/cli-engine/config-array/config-array";
import {
  CascadingConfigArrayFactory,
} from "eslint/lib/cli-engine/cascading-config-array-factory";

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
    this.factory = new CascadingConfigArrayFactory();

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
