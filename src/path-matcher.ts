import { IgnoredPaths } from "eslint/lib/cli-engine/ignored-paths";

export interface PathMatcher {
  notContains(filepath: string): boolean;
}

export type ESLintIgnoredPathsMatcherOptions = {
  projectDir: string;
};

export class ESLintIgnoredPathsMatcher implements PathMatcher {

  private ignoredPaths: IgnoredPaths;

  public constructor({ projectDir }: ESLintIgnoredPathsMatcherOptions) {
    this.ignoredPaths = new IgnoredPaths({
      cwd: projectDir,
    });
  }

  public notContains(filepath: string) {
    return this.ignoredPaths.contains(filepath);
  }
}
