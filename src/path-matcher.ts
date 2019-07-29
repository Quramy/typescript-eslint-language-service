import { IgnoredPaths } from "eslint/lib/cli-engine/ignored-paths";

export interface PathMatcher {
  shouldBeIgnored(filepath: string): boolean;
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

  public shouldBeIgnored(filepath: string) {
    return this.ignoredPaths.contains(filepath);
  }
}
