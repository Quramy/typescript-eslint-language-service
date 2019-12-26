#!/bin/sh

BASE_DIR=$(cd $(dirname $0); pwd)
yarn link

for dir in $(ls ${BASE_DIR}/projects); do
  pushd ${BASE_DIR}/projects/${dir}
  yarn --pure-lockfile
  yarn link typescript-eslint-language-service
  popd
done
