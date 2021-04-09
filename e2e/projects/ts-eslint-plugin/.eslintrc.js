module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: ["plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "dot-notation": "off",
    "no-implied-eval": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": "error",

    // issue 217
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-base-to-string": "error",
    "@typescript-eslint/no-confusing-void-expression": "error",
    "@typescript-eslint/dot-notation": ["error"],
    "@typescript-eslint/no-implied-eval": ["error"],
  },
};
