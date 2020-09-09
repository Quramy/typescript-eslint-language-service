#!/bin/sh

BASE_DIR=$(cd $(dirname $0); pwd)
yarn link

TS_VER=$(node -e "console.log(require('./package.json').devDependencies['typescript'])")
TSESLINT_VER=$(node -e "console.log(require('./package.json').devDependencies['@typescript-eslint/parser'])")

for dir in $(ls ${BASE_DIR}/projects); do
  pushd ${BASE_DIR}/projects/${dir}
  cat << EOF | node > PKG
const json = require('./package.json');
const ret = {
  ...json,
  devDependencies: Object.keys(json.devDependencies).reduce((acc, k) => {
    if (k === 'typescript') {
      return { ...acc, typescript: "${TS_VER}" };
    }
    if (k.startsWith('@typescript-eslint')) {
      return { ...acc, [k]: "${TSESLINT_VER}" };
    }
    return acc;
  }, json.devDependencies),
};
console.log(JSON.stringify(ret, null, 2));
EOF
  mv PKG package.json
  yarn
  yarn link typescript-eslint-language-service
  popd
done
