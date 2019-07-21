import fs from "fs";
import path from "path";
import { ChildProcess, fork } from "child_process";
import { EventEmitter } from "events";

export type Options = {
  projectPath: string;
};

class TSServer {

  private _projectPath: string;
  private _responseEventEmitter: EventEmitter;
  private _responseCommandEmitter: EventEmitter;
  private _exitPromise: Promise<number | null>;
  private _isClosed = false;
  private _server: ChildProcess;
  private _seq = 0;
  responses: any[] = [];
  constructor({ projectPath }: Options) {
    this._projectPath = projectPath;
    this._responseEventEmitter = new EventEmitter();
    this._responseCommandEmitter = new EventEmitter();
    const tsserverPath = require.resolve(path.join(projectPath, "node_modules/typescript/lib/tsserver"));
    const server = fork(tsserverPath, [], {
      // cwd: path.join(__dirname, "../projects"),
      stdio: ["pipe", "pipe", "pipe", "ipc"],
    });
    this._exitPromise = new Promise((resolve, reject) => {
      server.on("exit", code => resolve(code));
      server.on("error", reason => reject(reason));
    });
    server.stdout!.setEncoding("utf-8");
    server.stdout!.on("data", data => {
      const [,, res] = data.split("\n");
      const obj = JSON.parse(res);
      if (obj.type === "event") {
        this._responseEventEmitter.emit(obj.event, obj);
      } else if (obj.type === "response") {
        this._responseCommandEmitter.emit(obj.command, obj);
      }
      this.responses.push(obj);
    });
    this._isClosed = false;
    this._server = server;
    this._seq = 0;
    this.responses = [];
  }

  readFile(filepath: string) {
    const file = path.resolve(this._projectPath, filepath);
    const fileContent = fs.readFileSync(file, "utf8");
    return { file, fileContent };
  }

  send(command: any) {
    const seq = ++this._seq;
    const req = JSON.stringify(Object.assign({ seq: seq, type: "request" }, command)) + "\n";
    this._server.stdin!.write(req);
  }

  close() {
    if (!this._isClosed) {
      this._isClosed = true;
      this._server.stdin!.end();
    }
    return this._exitPromise;
  }

  wait(time = 0) {
    return new Promise(res => setTimeout(() => res(), time));
  }

  waitEvent(eventName: string) {
    return new Promise(res => this._responseEventEmitter.once(eventName, () => res()));
  }

  waitResponse(commandName: string) {
    return new Promise(res => this._responseCommandEmitter.once(commandName, () => res()));
  }
}

export function createServer(options: Options) {
  return new TSServer(options);
}
