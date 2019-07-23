module.exports = {
  env: {
    es6: true,
    node: true,
  },
  extends: [
    // "plugin:@typescript-eslint/recommended",
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
    "@typescript-eslint/no-unused-vars": "error",
  },
};

