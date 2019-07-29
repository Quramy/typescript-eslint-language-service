/**
 *
 * These modules are accesible, but they're not public API.
 *
 */
declare module "eslint/lib/cli-engine/config-array/extracted-config" {
  import { Linter } from "eslint";

  export interface InternalConfig extends Linter.Config {
    parser: any;
    plugins?: any;
  }

  export interface ExtractedConfig extends Linter.Config {
    toCompatibleObjectAsConfigFileContent(): Linter.Config;
  }
}

declare module "eslint/lib/cli-engine/config-array/config-array" {
  import { ExtractedConfig, InternalConfig } from "eslint/lib/cli-engine/config-array/extracted-config";

  export class ConfigArray<T = InternalConfig> extends Array<T> {
    public constructor(...args: T[]);
    public extractConfig(filename: string): ExtractedConfig;
  }
}

declare module "eslint/lib/cli-engine/cascading-config-array-factory" {
  import { InternalConfig } from "eslint/lib/cli-engine/config-array/extracted-config";
  import { ConfigArray } from "eslint/lib/cli-engine/config-array/config-array";

  /**
   *
   * See also https://github.com/eslint/eslint/blob/v6.1.0/lib/cli-engine/cascading-config-array-factory.js#L169
   *
   */
  export class CascadingConfigArrayFactory {
    public getConfigArrayForFile(filename: string): ConfigArray<InternalConfig>;
    public clearCache(): void;
  }
}

declare module "eslint/lib/cli-engine/ignored-paths" {
  export class IgnoredPaths {
    public constructor(options: { cwd?: string });
    public contains(filepath: string, category?: "default" | "custom" | undefined): boolean;
  }
}
