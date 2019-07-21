import * as ts from "typescript/lib/tsserverlibrary";
import { LanguageServiceProxyBuilder } from "./language-service-proxy-builder";
import { ESLintAdapter } from "./eslint-adapter";
import { AstConverter } from "./ast-converter";

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const logger = (msg: string) => info.project.projectService.logger.info(`[typescript-eslint-langage-service] ${msg}`);
  logger("config: " + JSON.stringify(info.config));

  const { languageServiceHost, languageService } = info;

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

  const adapter = new ESLintAdapter({
    logger,
    converter,
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
