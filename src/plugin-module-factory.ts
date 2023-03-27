import path from "path";
import ts from "typescript/lib/tsserverlibrary";
import { LanguageServiceProxyBuilder } from "./language-service-proxy-builder";
import { ESLintAdapter } from "./eslint-adapter";
import { ESLintConfigProvider } from "./eslint-config-provider";
import { TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE } from "./consts";

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  if (!!process.env["TS_ESLINT_SERVICE_DISABLED"]) return info.languageService;

  const { languageService, serverHost, project, config: pluginConfigObj } = info;

  const projectDir = path.dirname(project.getProjectName());
  const logger = (msg: string) => project.projectService.logger.info(`[typescript-eslint-language-service] ${msg}`);

  logger("config: " + JSON.stringify(pluginConfigObj));

  let watchDirs: string[];
  if (Array.isArray(pluginConfigObj.watchDirs)) {
    watchDirs = (pluginConfigObj.watchDirs as any[])
      .filter(x => typeof x === "string")
      .map(x => path.resolve(projectDir, x));
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

  const configProvider = new ESLintConfigProvider({
    directoriesToWatch: watchDirs,
    log: logger,
    host: serverHost,
  });

  const adapter = new ESLintAdapter({
    logger,
    configProvider,
    getSourceFile(fileName: string) {
      return getProgram().getSourceFile(fileName);
    },
  });

  const originalReadFileFn = serverHost.readFile;
  serverHost.readFile = (path: string, encoding?: string) => {
    adapter.checkFileToBeIgnored(path);
    return originalReadFileFn!(path, encoding);
  };

  const proxy = new LanguageServiceProxyBuilder(info)
    .wrap("getSemanticDiagnostics", delegate => adapter.getSemanticDiagnostics.bind(adapter, delegate))
    .wrap("getCodeFixesAtPosition", delegate => adapter.getCodeFixesAtPosition.bind(adapter, delegate))
    .wrap("getSupportedCodeFixes", delegate => (filename?: string | undefined) => [
      ...delegate(filename),
      `${TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE}`,
    ])
    .build();
  return proxy;
}

export const pluginModuleFactory: ts.server.PluginModuleFactory = ({ typescript }: { typescript: typeof ts }) => {
  try {
    // NOTE
    // Now ts.LanguageService does not exported method to get supported fixable codes.
    // So I monkey-patche to override ts.getSupportedCodeFixes til https://github.com/microsoft/TypeScript/pull/29010 is merged.
    const delegate = typescript.getSupportedCodeFixes;
    typescript.getSupportedCodeFixes = () => [...delegate(), `${TS_LANGSERVICE_ESLINT_DIAGNOSTIC_ERROR_CODE}`];
  } catch {
    // Nothing to do
  }

  return { create };
};
