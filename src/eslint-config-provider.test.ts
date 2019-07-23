import fs from "fs";
import path from "path";
import ts from "typescript";
import { ESLintConfigProvider } from "./eslint-config-provider";

const fixtureDirPath = path.resolve(__dirname, "../test-fixtures/eslnt-config-provider");

function readFile(path: string, encoding: string) {
  return fs.readFileSync(path, { encoding });
};

class FileUpdater {
  public path!: string;
  public originalContent?: string;
  public callbackList: { path: string; callback: ts.FileWatcherCallback }[] = [];
  public constructor() {
  }

  public init(path: string) {
    this.path = path;
    this.callbackList = [];
    this.originalContent = readFile(path, "utf8");
  }

  public update(replace: (old: string) => string) {
    if (this.originalContent) {
      const newContent = replace(this.originalContent);
      fs.writeFileSync(this.path, newContent, "utf8");
      this.callbackList.filter(({ path }) => this.path === path).forEach(({ callback }) => {
        callback(this.path, ts.FileWatcherEventKind.Changed);
      });
    }
  }

  public reset() {
    if (this.originalContent) {
      fs.writeFileSync(this.path, this.originalContent, "utf8");
      delete this.originalContent;
    }
    delete this.path;
    this.callbackList = [];
  }

  public createWatcher() {
    return {
      watchFile: (path: string, callback: ts.FileWatcherCallback) => {
        this.callbackList.push({ path, callback });
        return {
          close: () => { },
        } as ts.FileWatcher;
      }
    };
  }
}

describe("ESLintConfigProvider", () => {

  describe("#getConfigForFile", () => {

    let fileUpdater = new FileUpdater();
    afterEach(() => fileUpdater.reset());

    it("should load base config", () => {
      const prjDir = path.resolve(fixtureDirPath, "prj-with-eslintrc-yml");
      const provider = new ESLintConfigProvider({
        directoriesToWatch: [prjDir],
        host: {
          readFile,
          watchFile: fileUpdater.createWatcher().watchFile,
        },
      });
      const config = provider.getConfigForFile(path.resolve(prjDir, "main.ts"));
      expect(config.rules).toEqual({ curly: ["error"] });
    });

    it("should reload base config after changes eslintrc.yml file", () => {
      const prjDir = path.resolve(fixtureDirPath, "prj-with-eslintrc-yml");
      fileUpdater.init(path.resolve(prjDir, ".eslintrc.yml"));
      const provider = new ESLintConfigProvider({
        directoriesToWatch: [prjDir],
        host: {
          readFile,
          watchFile: fileUpdater.createWatcher().watchFile,
        },
      });
      provider.getConfigForFile(path.resolve(prjDir, "main.ts"));
      fileUpdater.update(s => s.replace("# TO_BE_ENABLED_AFTER ", ""));
      const configAfterChanges = provider.getConfigForFile(path.resolve(prjDir, "main.ts"));
      expect(configAfterChanges.rules).toEqual({ curly: ["error"], semi: ["error"] });
    });

    // FIXME
    // Using Node.js REPL, CascadingConfigArrayFactory#clearCache and relaod .eslintrc.js returns the updated config object.
    // But the reloading does not work well under thw folloiwng test case...
    it.skip("should reload base config after changes eslintrc.* file", () => {
      const prjDir = path.resolve(fixtureDirPath, "prj-with-eslintrc");
      fileUpdater.init(path.resolve(prjDir, ".eslintrc.js"));
      const provider = new ESLintConfigProvider({
        directoriesToWatch: [prjDir],
        host: {
          readFile,
          watchFile: fileUpdater.createWatcher().watchFile,
        },
      });
      provider.getConfigForFile(path.resolve(prjDir, "main.ts"));
      fileUpdater.update(s => s.replace("// TO_BE_ENABLED_AFTER ", ""));
      const configAfterChanges = provider.getConfigForFile(path.resolve(prjDir, "main.ts"));
      expect(configAfterChanges.rules).toEqual({ curly: ["error"], semi: ["error"] });
    });
  });

});
