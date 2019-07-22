import path from "path";
import * as ts from "typescript/lib/tsserverlibrary";
import { LanguageServiceProxyBuilder } from "./language-service-proxy-builder";
import { ESLintAdapter } from "./eslint-adapter";
import { AstConverter } from "./ast-converter";
import { ESLintConfigProvider } from "./eslint-config-provider";

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const { languageService, serverHost, project } = info;

  const projectDir = path.dirname(project.getProjectName());
  const logger = (msg: string) => project.projectService.logger.info(`[typescript-eslint-language-service] ${msg}`);

  const pluginConfigObj = info.config;

  logger("config: " + pluginConfigObj);

  let watchDirs: string[];
  if (Array.isArray(pluginConfigObj.watchDirs)) {
    watchDirs = (pluginConfigObj.watchDirs as any[]).filter(x => typeof x === "string").map(x => path.resolve(projectDir, x));
  } else {
    watchDirs = [projectDir];
  }

  const getProgram = () => {
    const program = languageService.getProgram();
    if (!program) {
      throw new Error();
    }
    return program;
  };

  const converter = new AstConverter({
    getProgram,
  });

  const configProvider = new ESLintConfigProvider({
    directoriesToWatch: watchDirs,
    host: serverHost,
  });

  const adapter = new ESLintAdapter({
    logger,
    converter,
    configProvider,
    getSourceFile(fileName: string) {
      return getProgram().getSourceFile(fileName);
    },
  });

  const proxy = new LanguageServiceProxyBuilder(info)
    .wrap("getSemanticDiagnostics", delegate => adapter.getSemanticDiagnostics.bind(adapter, delegate))
    .build()
  ;

  return proxy;
}

export const pluginModuleFactory: ts.server.PluginModuleFactory = () => {
  return { create };
};
