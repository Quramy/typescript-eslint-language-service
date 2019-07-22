# typescript-eslint-language-service

[![CircleCI](https://circleci.com/gh/Quramy/typescript-eslint-language-service.svg?style=svg)](https://circleci.com/gh/Quramy/typescript-eslint-language-service)
[![npm version](https://badge.fury.io/js/typescript-eslint-language-service.svg)](https://badge.fury.io/js/typescript-eslint-language-service)
![deps](https://david-dm.org/quramy/typescript-eslint-language-service.svg)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/Quramy/ts-graphql-plugin/master/LICENSE.txt)

TypeScript language service plugin to check ESLint errors.

![Image from Gyazo](https://i.gyazo.com/1f14fb8d09927b9388551058c3387b81.png)

## Features

- Report ESLint errors as TypeScript semantic diagnostics

## Usage

### Requirements (peer dependencies)

- `typescript`
- `@typescpt-eslint/parser`
- `eslint`

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
  name: "typescript-eslint-language-service",
  watchDirs: string[];
};
```

#### `watchDirs`

By default, this plugins watches only `.eslintrc.*` files that exist in your project root directory. If you want to watch other directories, add their names.

## LICENSE
MIT
