/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
// functions/eslint.config.js
/**
 * @file eslint.config.js
 * @description ESLint configuration file for the Firebase Functions project.
 *              This file uses the flat config format (an array of configuration objects).
 *              It extends Google's JavaScript style guide and adds custom rules.
 */

// --- Imports ---
/**
 * @name google
 * @description Google's ESLint configuration, providing a base set of JavaScript style rules.
 */
const google = require("eslint-config-google");

/**
 * @description The main ESLint configuration array. Each object in the array
 *              represents a configuration block that can apply to specific files
 *              and define language options and rules.
 */
module.exports = [
  {
    // This configuration block applies to all JavaScript files (`**/*.js`).
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2018, // Specifies the ECMAScript version to support (ES2018 features).
      sourceType: "module", // Allows the use of ES modules (import/export syntax).
    },
    rules: {
      // Inherit all rules from Google's JavaScript style guide.
      ...google.rules,
      // --- Custom Rule Overrides/Additions ---
      "valid-jsdoc": "off", // Disables the rule requiring JSDoc comments to be valid (often too strict or verbose for some projects).
      // Disallows specific global variables. "name" and "length" are often unintentionally shadowed.
      "no-restricted-globals": ["error", "name", "length"],
      // Requires arrow functions to be used as callbacks where applicable.
      "prefer-arrow-callback": "error",
      // Enforces the use of double quotes for strings, but allows template literals.
      "quotes": ["error", "double", {"allowTemplateLiterals": true}],
    },
  },
  {
    // This configuration block applies specifically to test files (e.g., `*.spec.js`).
    files: ["**/*.spec.*"],
    languageOptions: {
      // Defines global variables available in the test environment.
      globals: {
        // Makes `mocha` (a popular testing framework) available as a read-only global
        // in test files, so ESLint doesn't flag it as an undefined variable.
        mocha: "readonly",
      },
    },
  },
];
