import path from "path";
import ts from "typescript/lib/tsserverlibrary";
import { LanguageServiceProxyBuilder } from "./language-service-proxy-builder";
import { ESLintAdapter } from "./eslint-adapter";
import { AstConverter } from "./ast-converter";
import { ESLintConfigProvider } from "./eslint-config-provider";
import { ESLintIgnoredPathsMatcher } from "./path-matcher";
import { TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE } from "./consts";

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const { languageService, serverHost, project, config: pluginConfigObj } = info;

  const projectDir = path.dirname(project.getProjectName());
  const logger = (msg: string) => project.projectService.logger.info(`[typescript-eslint-language-service] ${msg}`);

  logger("config: " + JSON.stringify(pluginConfigObj));

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

  const pathMatcher = new ESLintIgnoredPathsMatcher({
    projectDir,
  });

  const adapter = new ESLintAdapter({
    logger,
    converter,
    configProvider,
    pathMatcher,
    getSourceFile(fileName: string) {
      return getProgram().getSourceFile(fileName);
    },
  });

  const proxy = new LanguageServiceProxyBuilder(info)
    .wrap("getSemanticDiagnostics", delegate => adapter.getSemanticDiagnostics.bind(adapter, delegate))
    .wrap("getCodeFixesAtPosition", delegate => adapter.getCodeFixesAtPosition.bind(adapter, delegate))
    .build()
  ;

  return proxy;
}

export const pluginModuleFactory: ts.server.PluginModuleFactory = ({ typescript }: { typescript: typeof ts }) => {

  // NOTE
  // Now ts.LanguageService does not exported method to get supported fixable codes.
  // So I monkey-patche to override ts.getSupportedCodeFixes til https://github.com/microsoft/TypeScript/pull/29010 is merged.
  const delegate = typescript.getSupportedCodeFixes;
  typescript.getSupportedCodeFixes = () => [...delegate(), `${TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE}`];

  return { create };
};
