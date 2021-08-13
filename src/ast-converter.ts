// Note:
//
// Almost all line in this source file are copied from https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/typescript-estree/src/parser.ts ,
// This code is workaround for https://github.com/typescript-eslint/typescript-eslint/issues/774 .

import ts from "typescript";
import { SourceCode, AST, Scope } from "eslint";
import { ParserOptions } from "@typescript-eslint/types";
import { analyze, AnalyzeOptions } from "@typescript-eslint/scope-manager";
import { visitorKeys } from "@typescript-eslint/visitor-keys";
import { ParseAndGenerateServicesResult, TSESTreeOptions } from "@typescript-eslint/typescript-estree";

import { sync as globSync } from "globby";
import isGlob from "is-glob";

/* The following types or functions are typescript-estree internals */
import { Extra } from "@typescript-eslint/typescript-estree/dist/parser-options";
import * as TsEstree from "@typescript-eslint/typescript-estree/dist/ast-converter";
import {
  CanonicalPath,
  getCanonicalFileName,
  ensureAbsolutePath,
} from "@typescript-eslint/typescript-estree/dist/create-program/shared";

function validateBoolean(value: boolean | undefined, fallback = false): boolean {
  if (typeof value !== "boolean") {
    return fallback;
  }
  return value;
}

function createExtra(code: string) {
  const base: Extra = {
    debugLevel: new Set(),
    tokens: null,
    range: true,
    loc: true,
    comment: false,
    comments: [],
    strict: false,
    jsx: false,
    useJSXTextNode: false,
    log: () => {},
    programs: null,
    projects: [],
    errorOnUnknownASTType: false,
    errorOnTypeScriptSyntacticAndSemanticIssues: false,
    code: "",
    tsconfigRootDir: process.cwd(),
    extraFileExtensions: [],
    preserveNodeMaps: undefined,
    createDefaultProgram: false,
    filePath: "",
    EXPERIMENTAL_useSourceOfProjectReferenceRedirect: false,
    singleRun: false,
    moduleResolver: "",
  };
  return {
    ...base,
    code,
    tokens: [],
    loc: true,
    comment: true,
    comments: [],
  };
}

function getTsconfigPath(tsconfigPath: string, extra: Extra): CanonicalPath {
  return getCanonicalFileName(ensureAbsolutePath(tsconfigPath, extra));
}

/**
 * Normalizes, sanitizes, resolves and filters the provided project paths
 */
function prepareAndTransformProjects(
  extra: Extra,
  projectsInput: string | string[] | undefined,
  ignoreListInput: string[],
): CanonicalPath[] {
  const sanitizedProjects: string[] = [];

  // Normalize and sanitize the project paths
  if (typeof projectsInput === "string") {
    sanitizedProjects.push(projectsInput);
  } else if (Array.isArray(projectsInput)) {
    for (const project of projectsInput) {
      if (typeof project === "string") {
        sanitizedProjects.push(project);
      }
    }
  }

  if (sanitizedProjects.length === 0) {
    return [];
  }

  // Transform glob patterns into paths
  const nonGlobProjects = sanitizedProjects.filter(project => !isGlob(project));
  const globProjects = sanitizedProjects.filter(project => isGlob(project));
  const uniqueCanonicalProjectPaths = new Set(
    nonGlobProjects
      .concat(
        globSync([...globProjects, ...ignoreListInput], {
          cwd: extra.tsconfigRootDir,
        }),
      )
      .map(project => getTsconfigPath(project, extra)),
  );

  // extra.log(
  //   'parserOptions.project (excluding ignored) matched projects: %s',
  //   uniqueCanonicalProjectPaths,
  // );

  return Array.from(uniqueCanonicalProjectPaths);
}

function applyParserOptionsToExtra(extra: Extra, options: TSESTreeOptions) {
  extra.range = typeof options.range === "boolean" ? options.range : extra.range;
  extra.loc = typeof options.loc === "boolean" ? options.loc : extra.range;
  /**
   * Track tokens in the AST
   */
  if (typeof options.tokens === "boolean" && options.tokens) {
    extra.tokens = [];
  }
  /**
   * Track comments in the AST
   */
  if (typeof options.comment === "boolean" && options.comment) {
    extra.comment = true;
    extra.comments = [];
  }
  /**
   * Enable JSX - note the applicable file extension is still required
   */
  if (typeof options.jsx === "boolean" && options.jsx) {
    extra.jsx = true;
  }
  /**
   * The JSX AST changed the node type for string literals
   * inside a JSX Element from `Literal` to `JSXText`.
   *
   * When value is `true`, these nodes will be parsed as type `JSXText`.
   * When value is `false`, these nodes will be parsed as type `Literal`.
   */
  if (typeof options.useJSXTextNode === "boolean" && options.useJSXTextNode) {
    extra.useJSXTextNode = true;
  }
  /**
   * Allow the user to cause the parser to error if it encounters an unknown AST Node Type
   * (used in testing)
   */
  if (typeof options.errorOnUnknownASTType === "boolean" && options.errorOnUnknownASTType) {
    extra.errorOnUnknownASTType = true;
  }
  /**
   * Allow the user to override the function used for logging
   */
  if (typeof options.loggerFn === "function") {
    extra.log = options.loggerFn;
  } else if (options.loggerFn === false) {
    extra.log = Function.prototype as any;
  }

  if (typeof options.tsconfigRootDir === "string") {
    extra.tsconfigRootDir = options.tsconfigRootDir;
  }

  // NOTE - ensureAbsolutePath relies upon having the correct tsconfigRootDir in extra
  extra.filePath = ensureAbsolutePath(extra.filePath, extra);

  if (Array.isArray(options.programs)) {
    if (options.programs.length) {
      extra.programs = options.programs;
    }
  }

  if (!extra.programs) {
    const projectFolderIgnoreList = (options.projectFolderIgnoreList ?? ["**/node_modules/**"])
      .reduce<string[]>((acc, folder) => {
        if (typeof folder === "string") {
          acc.push(folder);
        }
        return acc;
      }, [])
      // prefix with a ! for not match glob
      .map(folder => (folder.startsWith("!") ? folder : `!${folder}`));
    // NOTE - prepareAndTransformProjects relies upon having the correct tsconfigRootDir in extra
    extra.projects = prepareAndTransformProjects(extra, options.project, projectFolderIgnoreList);
  }

  if (Array.isArray(options.extraFileExtensions) && options.extraFileExtensions.every(ext => typeof ext === "string")) {
    extra.extraFileExtensions = options.extraFileExtensions;
  }

  /**
   * Allow the user to enable or disable the preservation of the AST node maps
   * during the conversion process.
   *
   * NOTE: For backwards compatibility we also preserve node maps in the case where `project` is set,
   * and `preserveNodeMaps` is not explicitly set to anything.
   */
  extra.preserveNodeMaps = typeof options.preserveNodeMaps === "boolean" && options.preserveNodeMaps;
  if (options.preserveNodeMaps === undefined && extra.projects.length > 0) {
    extra.preserveNodeMaps = true;
  }

  // extra.createDefaultProgram = typeof options.createDefaultProgram === "boolean" && options.createDefaultProgram;

  extra.EXPERIMENTAL_useSourceOfProjectReferenceRedirect =
    typeof options.EXPERIMENTAL_useSourceOfProjectReferenceRedirect === "boolean" &&
    options.EXPERIMENTAL_useSourceOfProjectReferenceRedirect;

  if (typeof options.moduleResolver === "string") {
    extra.moduleResolver = options.moduleResolver;
  }

  return extra;
}

export type AstConverterCreateOptions = {
  getProgram: () => ts.Program;
};

export class AstConverter {
  private readonly getProgram: () => ts.Program;

  public constructor({ getProgram }: AstConverterCreateOptions) {
    this.getProgram = getProgram;
  }

  /**
   *
   * see also https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/typescript-estree/src/parser.ts#L346
   *
   */
  public parseAndGenerateServices(src: ts.SourceFile, options: TSESTreeOptions) {
    const code = src.getFullText();
    let extra: Extra = createExtra(code);

    extra.code = code;

    /**
     * Apply the given parser options
     */
    if (typeof options !== "undefined") {
      extra = applyParserOptionsToExtra(extra, options);
      if (
        typeof options.errorOnTypeScriptSyntacticAndSemanticIssues === "boolean" &&
        options.errorOnTypeScriptSyntacticAndSemanticIssues
      ) {
        extra.errorOnTypeScriptSyntacticAndSemanticIssues = true;
      }
    }

    const shouldProvideParserServices = extra.projects && extra.projects.length > 0;

    // Note: astConverter is an internal API
    const convert = TsEstree.astConverter;
    const { estree, astMaps } = convert(src, extra, true);

    /**
     * Return the converted AST and additional parser services
     */
    const ret: ParseAndGenerateServicesResult<any> = {
      ast: estree,
      services: {
        program: this.getProgram(),
        hasFullTypeInformation: shouldProvideParserServices,
        esTreeNodeToTSNodeMap: astMaps.esTreeNodeToTSNodeMap,
        tsNodeToESTreeNodeMap: astMaps.tsNodeToESTreeNodeMap,
      },
    };
    return ret;
  }

  /**
   * See also https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/parser/src/parser.ts
   */
  public parseForESLint(src: ts.SourceFile, options?: ParserOptions | null) {
    try {
      if (!options || typeof options !== "object") {
        options = {};
      }

      if (options.sourceType !== "module" && options.sourceType !== "script") {
        options.sourceType = "script";
      }
      if (typeof options.ecmaFeatures !== "object") {
        options.ecmaFeatures = {};
      }

      const parserOptions: TSESTreeOptions = {};
      Object.assign(parserOptions, options, {
        useJSXTextNode: validateBoolean(options.useJSXTextNode, true),
        jsx: validateBoolean(options.ecmaFeatures.jsx),
      });

      const analyzeOptions: AnalyzeOptions = {
        ecmaVersion: options.ecmaVersion,
        globalReturn: options.ecmaFeatures.globalReturn,
        jsxPragma: options.jsxPragma,
        jsxFragmentName: options.jsxFragmentName,
        lib: options.lib,
        sourceType: options.sourceType,
      };

      if (typeof options.filePath === "string") {
        const tsx = options.filePath.endsWith(".tsx");
        if (tsx || options.filePath.endsWith(".ts")) {
          parserOptions.jsx = tsx;
        }
      }

      /**
       * Allow the user to suppress the warning from typescript-estree if they are using an unsupported
       * version of TypeScript
       */
      const warnOnUnsupportedTypeScriptVersion = validateBoolean(options.warnOnUnsupportedTypeScriptVersion, true);
      if (!warnOnUnsupportedTypeScriptVersion) {
        parserOptions.loggerFn = false;
      }

      const { ast, services } = this.parseAndGenerateServices(src, parserOptions);
      ast.sourceType = options.sourceType;

      const scopeManager = analyze(ast, analyzeOptions);

      return {
        ast: ast as AST.Program,
        scopeManager: scopeManager as Scope.ScopeManager,
        services,
        visitorKeys: visitorKeys as SourceCode.VisitorKeys,
      };
    } catch (error) {
      throw error;
    }
  }

  public convertToESLintSourceCode(src: ts.SourceFile, options?: ParserOptions | null) {
    const code = src.getFullText();
    const { ast, scopeManager, services, visitorKeys } = this.parseForESLint(src, options);

    return new SourceCode({
      text: code,
      ast,
      scopeManager,
      parserServices: services,
      visitorKeys,
    });
  }
}
