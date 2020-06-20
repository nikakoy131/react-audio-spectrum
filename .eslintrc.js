module.exports = {
  extends: ['airbnb-typescript'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    "react/jsx-props-no-spreading": "off",
    "max-len": ["error", { "ignoreComments": true }],
    "no-console": ["error", { allow: ["warn", "error"] }]
  }
};