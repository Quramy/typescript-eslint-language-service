import path from "path";
import assert from "assert";
import { createServer, TSServer } from "../helper/server";

function findResponse(responses: any[], commandName: string) {
  return responses.find(response => response.command === commandName);
}

describe("LanguageService plugin", () => {
  let server: TSServer;

  afterEach(async () => {
    if (server) await server.close();
  });
  describe("#getCodeFixes", () => {
    it("should not return ESLint error when the project does not use @typescript-eslint/parser", async () => {
      server = createServer({ projectPath: path.resolve(__dirname, "../projects/simple") });
      const { file, fileContent } = server.readFile("./main.ts");
      server.send({ command: "open", arguments: { file, fileContent, scriptKindName: "TS" } });
      await server.waitEvent("projectLoadingFinish");
      server.send({ command:"getCodeFixes",arguments:{ file, startLine:1, startOffset:12, endLine:1, endOffset:12, errorCodes:[30010] } });
      await server.waitResponse("getCodeFixes");
      const found = findResponse(server.responses, "getCodeFixes");
      if (!found) {
        throw new assert.AssertionError();
      }
      expect(found).toMatchSnapshot();
    });
  });
});
