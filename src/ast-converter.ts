import * as ts from "typescript";
import { ParserOptions } from "@typescript-eslint/parser";
import { SourceCode, AST, Scope } from "eslint";
import { Extra } from "@typescript-eslint/typescript-estree/dist/parser-options";
import { analyzeScope } from "@typescript-eslint/parser/dist/analyze-scope";
import { simpleTraverse } from "@typescript-eslint/parser/dist/simple-traverse";
import { visitorKeys } from "@typescript-eslint/parser/dist/visitor-keys";
import { ParseAndGenerateServicesResult, TSESTreeOptions } from "@typescript-eslint/typescript-estree";
import convert from "@typescript-eslint/typescript-estree/dist/ast-converter";

function validateBoolean(value: boolean | undefined, fallback: boolean = false): boolean {
  if (typeof value !== 'boolean') {
    return fallback;
  }
  return value;
}

function createExtra(code: string) {
  const base = {
    tokens: null,
    range: false,
    loc: false,
    comment: false,
    comments: [],
    strict: false,
    jsx: false,
    useJSXTextNode: false,
    log: console.log,
    projects: [],
    errorOnUnknownASTType: false,
    errorOnTypeScriptSyntacticAndSemanticIssues: false,
    code: "",
    tsconfigRootDir: process.cwd(),
    extraFileExtensions: [],
    preserveNodeMaps: undefined,
  } as Extra;
  return {
    ...base,
    code,
    tokens: [],
    loc: true,
    comment: true,
    comments: [],
  } as Extra;
}

function applyParserOptionsToExtra(extra: Extra, options: TSESTreeOptions) {
  /**
   * Track range information in the AST
   */
  extra.range = typeof options.range === "boolean" && options.range;
  extra.loc = typeof options.loc === "boolean" && options.loc;
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
  if (
    typeof options.errorOnUnknownASTType === "boolean" &&
    options.errorOnUnknownASTType
  ) {
    extra.errorOnUnknownASTType = true;
  }
  /**
   * Allow the user to override the function used for logging
   */
  if (typeof options.loggerFn === "function") {
    extra.log = options.loggerFn;
  } else if (options.loggerFn === false) {
    extra.log = Function.prototype;
  }

  if (typeof options.project === "string") {
    extra.projects = [options.project];
  } else if (
    Array.isArray(options.project) &&
    options.project.every(projectPath => typeof projectPath === "string")
  ) {
    extra.projects = options.project;
  }

  if (typeof options.tsconfigRootDir === "string") {
    extra.tsconfigRootDir = options.tsconfigRootDir;
  }

  if (
    Array.isArray(options.extraFileExtensions) &&
    options.extraFileExtensions.every(ext => typeof ext === "string")
  ) {
    extra.extraFileExtensions = options.extraFileExtensions;
  }
  /**
   * Allow the user to enable or disable the preservation of the AST node maps
   * during the conversion process.
   *
   * NOTE: For backwards compatibility we also preserve node maps in the case where `project` is set,
   * and `preserveNodeMaps` is not explicitly set to anything.
   */
  extra.preserveNodeMaps =
    typeof options.preserveNodeMaps === "boolean" && options.preserveNodeMaps;
  if (options.preserveNodeMaps === undefined && extra.projects.length > 0) {
    extra.preserveNodeMaps = true;
  }

  return extra;
}

export type AstConverterCreateOptions = {
  program: ts.Program,
};

export class AstConverter {
  public program: ts.Program;

  constructor({ program }: AstConverterCreateOptions) {
    this.program = program;
  }

  /**
   *
   * see also https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/typescript-estree/src/parser.ts#L346
   *
   */
  parseAndGenerateServices(src: ts.SourceFile, options: TSESTreeOptions) {
    const code = src.getFullText();
    let extra: Extra = createExtra(code);

    extra.code = code;

    /**
     * Apply the given parser options
     */
    if (typeof options !== "undefined") {
      extra = applyParserOptionsToExtra(extra, options);
      if (typeof options.errorOnTypeScriptSyntacticAndSemanticIssues === "boolean" && options.errorOnTypeScriptSyntacticAndSemanticIssues) {
        extra.errorOnTypeScriptSyntacticAndSemanticIssues = true;
      }
    }
    const { estree, astMaps } = convert(src, extra, true);

    /**
     * Return the converted AST and additional parser services
     */
    return {
      ast: estree,
      services: {
        program: this.program,
        esTreeNodeToTSNodeMap: astMaps ? astMaps.esTreeNodeToTSNodeMap : undefined,
        tsNodeToESTreeNodeMap: astMaps ? astMaps.tsNodeToESTreeNodeMap : undefined,
      },
    } as ParseAndGenerateServicesResult<any>;
  }

  /**
   * See also https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/parser/src/parser.ts
   */
  parseForESLint(src: ts.SourceFile, options?: ParserOptions | null) {
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

      if (typeof options.filePath === "string") {
        const tsx = options.filePath.endsWith(".tsx");
        if (tsx || options.filePath.endsWith(".ts")) {
          parserOptions.jsx = tsx;
        }
      }

      const { ast, services } = this.parseAndGenerateServices(src, parserOptions);

      simpleTraverse(ast, {
        enter(node) {
          switch (node.type) {
            // Function#body cannot be null in ESTree spec.
            case 'FunctionExpression':
              if (!node.body) {
              node.type = `TSEmptyBody${node.type}` as any;
            }
            break;
            // no default
          }
        },
      });

      const scopeManager = analyzeScope(ast, parserOptions);

      return {
        ast: ast as AST.Program,
        scopeManager: scopeManager as Scope.ScopeManager,
        services,
        visitorKeys,
      };
    } catch (error) {
      throw new Error();
    }
  }

  convertToESLintSourceCode(src: ts.SourceFile, options?: ParserOptions | null) {

    const code = src.getFullText();
    const { ast, scopeManager } = this.parseForESLint(src, options);

    return new SourceCode({
      text: code,
      ast,
      scopeManager,
    });
  }
}
