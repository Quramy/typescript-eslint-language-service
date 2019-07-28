import path from "path";
import assert from "assert";
import ts from "typescript/lib/tsserverlibrary";
import { createServer, TSServer } from "../helper/server";

function findEventResponse(responses: any[], eventName: string) {
  return responses.find(response => response.event === eventName);
}

function findCommandResponse(responses: any[], commandName: string) {
  return responses.find(response => response.command === commandName);
}

function maskFileNameForDiagnostics(result: ts.server.protocol.DiagnosticEvent) {
  if (!result.body) return result;
  result.body.file = "<file>";
  return result;
}

function maskFileNameForCodeFixes(response: ts.server.protocol.CodeFixResponse) {
  if (!response.body) return response;
  response.body = response.body.map(b => {
    b.fixName = "<fileName>";
    b.changes = b.changes.map(c => {
      c.fileName = "<fileName>";
      return c;
    });
    return b;
  });
  return response;
}

describe("LanguageService plugin", () => {
  let server: TSServer;

  afterEach(async () => {
    if (server) await server.close();
  });
  describe("#getSemanticDiagnostics", () => {
    it("should not return ESLint error when the project does not use @typescript-eslint/parser", async () => {
      server = createServer({ projectPath: path.resolve(__dirname, "../projects/other-parser") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findEventResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(maskFileNameForDiagnostics(found)).toMatchSnapshot();
    });

    it("should return ESLint error when the project uses @typescript-eslint/parser", async () => {
      server = createServer({ projectPath: path.resolve(__dirname, "../projects/simple") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findEventResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(maskFileNameForDiagnostics(found)).toMatchSnapshot();
    });

    it("should return ESLint error when the project is configured with ESLint plugins", async () => {
      server = createServer({ projectPath: path.resolve(__dirname, "../projects/ts-eslint-plugin") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findEventResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(maskFileNameForDiagnostics(found)).toMatchSnapshot();
    });

    it("should not reproduce issue #7", async () => {
      server = createServer({ projectPath: path.resolve(__dirname, "../projects/ts-eslint-plugin") });
      const { file, fileContent } = server.readFile("./reproduce_issue_7/main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findEventResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(maskFileNameForDiagnostics(found)).toMatchSnapshot();
    });
  });

  describe("#getCodeFixes", () => {
    it("should not return ESLint error when the project does not use @typescript-eslint/parser", async () => {
      server = createServer({ projectPath: path.resolve(__dirname, "../projects/simple") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command:"getCodeFixes",arguments:{ file, startLine:1, startOffset:12, endLine:1, endOffset:12, errorCodes:[30010] } });
      await server.waitResponse("getCodeFixes");
      const found = findCommandResponse(server.responses, "getCodeFixes");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(maskFileNameForCodeFixes(found)).toMatchSnapshot();
    });
  });

});
