module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  extends: ["eslint:recommended"],
  parserOptions: {
    project: "../tsconfig.json",
  },
  rules: {
    semi: 2,
  },
};
