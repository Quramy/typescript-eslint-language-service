module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parser: "babel-eslint",
  parserOptions: {
    sourceType: "module",
    allowImportExportEverywhere: false,
    ecmaFeatures: {
      globalReturn: false,
    },
  },
  rules: {
    semi: 2,
  },
};
