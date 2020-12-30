module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: [
    "@typescript-eslint",
  ],
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": "error",
  },
};

