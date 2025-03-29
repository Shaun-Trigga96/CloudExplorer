/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
// functions/eslint.config.js
const google = require("eslint-config-google");

module.exports = [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
    },
    rules: {
      ...google.rules,
      "valid-jsdoc": "off",
      "no-restricted-globals": ["error", "name", "length"],
      "prefer-arrow-callback": "error",
      "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    },
  },
  {
    files: ["**/*.spec.*"],
    languageOptions: {
      globals: {
        mocha: "readonly",
      },
    },
  },
];
