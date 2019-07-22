/**
 *
 * These modules are accesible, but they're not public API.
 *
 */
declare module "eslint/lib/cli-engine/cascading-config-array-factory" {

  import { Linter } from "eslint";

  export interface InternalConfig extends Linter.Config {
  }

  export interface ExtractedConfig extends Linter.Config {
    toCompatibleObjectAsConfigFileContent(): Linter.Config;
  }

  export interface ConfigArray<T> extends Array<T> {
    extractConfig(filename: string): ExtractedConfig;
  }

  /**
   *
   * See also https://github.com/eslint/eslint/blob/v6.1.0/lib/cli-engine/cascading-config-array-factory.js#L169
   *
   */
  export class CascadingConfigArrayFactory {
    getConfigArrayForFile(filename: string): ConfigArray<InternalConfig>;
    clearCache(): void;
  }

}
