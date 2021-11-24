# typescript-eslint-language-service

[![github actions](https://github.com/Quramy/typescript-eslint-language-service/workflows/build/badge.svg)](https://github.com/Quramy/typescript-eslint-language-service/actions)
[![npm version](https://badge.fury.io/js/typescript-eslint-language-service.svg)](https://badge.fury.io/js/typescript-eslint-language-service)
![deps](https://david-dm.org/quramy/typescript-eslint-language-service.svg)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/Quramy/ts-graphql-plugin/master/LICENSE.txt)

TypeScript language service plugin to check ESLint errors.

![Screencast](https://raw.githubusercontent.com/Quramy/typescript-eslint-language-service/master/cast.gif)

## Features

- Report ESLint errors as TypeScript semantic diagnostics
- Create code-fix for ESLint errors if they have fixer

## Usage

### Requirements (peer dependencies)

- `typescript`
- `@typescript-eslint/parser` >= 5.0.0
- `eslint` >= 8.0.0

### Install

```sh
npm install typescript-eslint-language-service -D
```

### Configure

And configure `plugins` section in your tsconfig.json, for example:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es5",
    "plugins": [
      {
        "name": "typescript-eslint-language-service"
      }
    ]
  }
}
```

It's ready to go. Launch your TypeScript IDE.

### Plugin options

```ts
type PluginOptions = {
  name: "typescript-eslint-language-service";
  watchDirs?: string[];
};
```

#### `watchDirs`

By default, this plugins watches only `.eslintrc.*` files that exist in your project root directory. If you want to watch other directories, add their names.

### Tips

- Set `TS_ESLINT_SERVICE_DISABLED` env parameter and restart your IDE to turn this plugin off.

### If you use older version of `ESLint` packages

- **If your eslint version is < 8.0.0, install `typescript-eslint-language-service@4.x.x`.**

### If you use older version of `@typescript-eslint` packages

- **If your @typescript-eslint tool's version is < 4.0.0, install `typescript-eslint-language-service@3.1.x`.**
- **If your @typescript-eslint tool's version is <= 3.4.0, install `typescript-eslint-language-service@3.0.x`.**
- **If your @typescript-eslint tool's version is <= 2.x.x, install `typescript-eslint-language-service@2.x.x`.**

## LICENSE

MIT
