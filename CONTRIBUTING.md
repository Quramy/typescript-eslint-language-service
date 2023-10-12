## Setup

```sh
$ npm install
```

```sh
$ npm run build:local
```

The above command builds this plugin under `local` directory.
And the built module is referenced from this project's tsconfig.json.
So, whenever you edit the source code of this project, this plugin itself tell you ESLint errors on your editor.

If you want to update modules in `local` dir, exec `npm run build:local` .

## Test

### Unit test

```sh
$ npm run test
```

### Lint

```sh
$ npm run lint
```

### E2E

```sh
$ npm run build
$ ./e2e/setup.sh
$ npm run e2e
```
