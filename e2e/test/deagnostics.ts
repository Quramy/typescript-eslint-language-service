import path from "path";
import assert from "assert";
import { createServer } from "../helper/server";
import * as ts from "typescript/lib/tsserverlibrary";

function findResponse(responses: any[], eventName: string) {
  return responses.find(response => response.event === eventName);
}

describe("LanguageService plugin", () => {
  describe("#getSemanticDiagnostics", () => {
    it("should not return ESLint error when the project use @typescript-eslint/parser", async () => {
      const server = createServer({ projectPath: path.resolve(__dirname, "../projects/other-parser") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      const semanticDiag = found as ts.server.protocol.DiagnosticEvent;
      expect(semanticDiag.body!.file).toBe(file);
      expect(semanticDiag.body!.diagnostics.length).toBe(0);
      await server.close();
    });

    it("should return ESLint error when the project use @typescript-eslint/parser", async () => {
      const server = createServer({ projectPath: path.resolve(__dirname, "../projects/simple") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      const semanticDiag = found as ts.server.protocol.DiagnosticEvent;
      expect(semanticDiag.body!.file).toBe(file);
      const diagnostic = semanticDiag.body!.diagnostics[0];
      expect(diagnostic.text).toMatch(/Missing semicolon./);
      await server.close();
    });

    it("should return ESLint error when the project configured with ESLint plugins", async () => {
      const server = createServer({ projectPath: path.resolve(__dirname, "../projects/ts-recommended") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      const semanticDiag = found as ts.server.protocol.DiagnosticEvent;
      expect(semanticDiag.body!.file).toBe(file);
      const diagnostic = semanticDiag.body!.diagnostics[0];
      expect(diagnostic.text).toMatch(/@typescript-eslint\/no-unused-vars/);
      await server.close();
    });
  });
});
