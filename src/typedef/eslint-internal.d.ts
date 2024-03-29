/**
 *
 * These modules are accesible, but they're not public API.
 *
 */
declare module "eslint/lib/cli-engine/ignored-paths" {
  export class IgnoredPaths {
    public constructor(options: { cwd?: string });
    public contains(filepath: string, category?: "default" | "custom" | undefined): boolean;
  }
}

declare module "@eslint/eslintrc/lib/config-array/extracted-config" {
  import { Linter } from "eslint";

  export interface InternalConfig extends Linter.Config {
    parser: any;
    plugins?: any;
  }

  export interface ExtractedConfig extends Linter.Config {
    toCompatibleObjectAsConfigFileContent(): Linter.Config;
  }
}

declare module "@eslint/eslintrc" {
  import { ExtractedConfig, InternalConfig } from "@eslint/eslintrc/lib/config-array/extracted-config";
  import { CascadingConfigArrayFactory } from "@eslint/eslintrc/lib/cascading-config-array-factory";
  export type { CascadingConfigArrayFactory } from "@eslint/eslintrc/lib/cascading-config-array-factory";

  export class ConfigArray<T = InternalConfig> extends Array<T> {
    public constructor(...args: T[]);
    public extractConfig(filename: string): ExtractedConfig;
  }

  export class ConfigDependency {
    public constructor(arg: any);
  }

  export const Legacy = {
    ConfigDependency,
    ConfigArray,
    CascadingConfigArrayFactory,
  };
}

declare module "@eslint/eslintrc/lib/cascading-config-array-factory" {
  // eslint-disable-next-line
  import { InternalConfig } from "@eslint/eslintrc/lib/config-array/extracted-config";
  import { ConfigArray } from "@eslint/eslintrc/lib/config-array/config-array";

  /**
   *
   * See also https://github.com/eslint/eslint/blob/v6.1.0/lib/cascading-config-array-factory.js#L169
   *
   */
  export class CascadingConfigArrayFactory {
    constructor(options: { eslintRecommendedPath?: string | undefined; eslintAllPath?: string | undefined });
    public getConfigArrayForFile(filename: string): ConfigArray<InternalConfig>;
    public clearCache(): void;
  }
}

declare module "@eslint/eslintrc/lib/ignored-paths" {
  export class IgnoredPaths {
    public constructor(options: { cwd?: string });
    public contains(filepath: string, category?: "default" | "custom" | undefined): boolean;
  }
}
