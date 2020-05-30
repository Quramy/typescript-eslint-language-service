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
- `@typescript-eslint/parser` >= 3.0.0
- `@typescript-eslint/typescript-estree` >= 3.0.0
- `eslint`

** If you use `@typescript-eslint/**`< 3.0.0, install`typescript-eslint-language-service@2.x.x` .\*\*

### Install

```sh
npm install typescript-eslint-language-service
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

## LICENSE

MIT
