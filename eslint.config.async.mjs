import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The promise-safety gate, kept separate from the general lint config so it can
 * be required to pass on its own.
 *
 * `AccessRightsHelper.hasPermission` is asynchronous: a forgotten `await` leaves
 * a pending promise, which is truthy, so `if (hasPermission(...))` would grant
 * access to everyone holding the token regardless of its contextual `check`.
 * `no-misused-promises` turns exactly that mistake into an error.
 */
export default [
    {
        files: ["src/**/*.ts"],
        ignores: ["src/assets/**", "src/ui/**"],

        plugins: {
            "@typescript-eslint": typescriptEslint,
        },

        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: ["./src/tsconfig.json"],
                tsconfigRootDir: __dirname,
            },
        },

        rules: {
            "@typescript-eslint/no-misused-promises": ["error", {
                checksConditionals: true,
                checksVoidReturn: false,
                checksSpreads: true,
            }],
        },
    },
];
