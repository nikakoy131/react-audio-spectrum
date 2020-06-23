module.exports = {
  extends: ['plugin:react-hooks/recommended', 'airbnb-typescript'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    "react/jsx-props-no-spreading": "off",
    "max-len": ["error", { "ignoreComments": true, "code": 100 }],
    "no-console": ["error", { allow: ["warn", "error"] }]
  }
};