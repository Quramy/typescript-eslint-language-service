## Setup

```sh
$ yarn --pure-lockfile
```

The above command builds this plugin under `local` directory.
And the built module is referenced from this project's tsconfig.json.
So, whenever you edit the source code of this project, this plugin itself tell you ESLint errors on your editor.

If you want to update modules in `local` dir, exec `yarn build:local` .

## Test

### Unit test

```sh
$ yarn test
```

### Lint

```sh
$ yarn lint
```

### E2E

```sh
$ yarn build
$ ./e2e/setup.sh
$ yarn e2e
```

