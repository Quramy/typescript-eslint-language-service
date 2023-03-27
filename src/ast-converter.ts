// Note:
//
// Almost all line in this source file are copied from https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/typescript-estree/src/parser.ts ,
// This code is workaround for https://github.com/typescript-eslint/typescript-eslint/issues/774 .

import ts from "typescript";
import { SourceCode } from "eslint";
import { ParserOptions } from "@typescript-eslint/types";

import { parseForESLint } from "@typescript-eslint/parser";

export class AstConverter {
  public convertToESLintSourceCode(src: ts.SourceFile, filename: string, options?: ParserOptions | null) {
    const code = src.getFullText();
    const originalOpt = options ?? {};
    const { ast, scopeManager, services, visitorKeys } = parseForESLint(code, {
      ...originalOpt,
      filePath: filename,
      comment: true,
      loc: true,
      range: true,
      tokens: true,
      warnOnUnsupportedTypeScriptVersion: false,
    });
    const source = new SourceCode({
      text: code,
      ast,
      scopeManager,
      parserServices: services,
      visitorKeys,
    } as unknown as any);
    return source;
  }
}
