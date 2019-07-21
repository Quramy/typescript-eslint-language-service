import * as ts from 'typescript/lib/tsserverlibrary';
import { LanguageServiceProxyBuilder } from './language-service-proxy-builder';
// import { findAllNodes, findNode } from './ts-util';

function create(info: ts.server.PluginCreateInfo): ts.LanguageService {
  const logger = (msg: string) => info.project.projectService.logger.info(`[typescript-eslint-langage-service] ${msg}`);
  logger('config: ' + JSON.stringify(info.config));

  const proxy = new LanguageServiceProxyBuilder(info)
    // .wrap('getSemanticDiagnostics', delegate => adapter.getSemanticDiagnostics.bind(adapter, delegate))
    .build()
  ;

  return proxy;
}

export const pluginModuleFactory: ts.server.PluginModuleFactory = () => {
  return { create };
};
