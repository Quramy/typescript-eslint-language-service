#!/bin/sh

BASE_DIR=$(cd $(dirname $0); pwd)

pushd ${BASE_DIR}/projects/simple
yarn --pure-lockfile
popd
