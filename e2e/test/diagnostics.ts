import path from "path";
import assert from "assert";
import { createServer, TSServer } from "../helper/server";

function findResponse(responses: any[], eventName: string) {
  return responses.find(response => response.event === eventName);
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
      const found = findResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(found).toMatchSnapshot();
    });

    it("should return ESLint error when the project uses @typescript-eslint/parser", async () => {
      server = createServer({ projectPath: path.resolve(__dirname, "../projects/simple") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(found).toMatchSnapshot();
    });

    it("should return ESLint error when the project is configured with ESLint plugins", async () => {
      server = createServer({ projectPath: path.resolve(__dirname, "../projects/ts-eslint-plugin") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(found).toMatchSnapshot();
    });

    it("should not reproduce issue #7", async () => {
      server = createServer({ projectPath: path.resolve(__dirname, "../projects/ts-eslint-plugin") });
      const { file, fileContent } = server.readFile("./reproduce_issue_7/main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command: "geterr", arguments: { files: [file], delay: 0 } });
      await server.waitEvent("semanticDiag");
      const found = findResponse(server.responses, "semanticDiag");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(found).toMatchSnapshot();
    });
  });
});
