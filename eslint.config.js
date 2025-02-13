import pluginJs from "@eslint/js";
import pluginQuery from "@tanstack/eslint-plugin-query";
// @ts-expect-error eslint-config-turbo is not typed
// import turboConfig from "eslint-config-turbo/flat";
// @ts-expect-error eslint-plugin-import is not typed
import * as pluginImport from "eslint-plugin-import";
import perfectionist from "eslint-plugin-perfectionist";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	////////////////////////////////////////////////////////////////////////////
	// FILES AND IGNORES
	////////////////////////////////////////////////////////////////////////////
	{ files: ["**/*.{js,mjs,cjs,ts}"] },
	{ ignores: ["**/node_modules/**", "**/dist/**", "**/out/**"] },

	////////////////////////////////////////////////////////////////////////////
	// GLOBALS
	////////////////////////////////////////////////////////////////////////////
	{ languageOptions: { globals: globals.node } },

	////////////////////////////////////////////////////////////////////////////
	// TURBO
	////////////////////////////////////////////////////////////////////////////
	// ...turboConfig,

	////////////////////////////////////////////////////////////////////////////
	// PLUGIN QUERY (TANSTACK)
	////////////////////////////////////////////////////////////////////////////
	...pluginQuery.configs["flat/recommended"],

	////////////////////////////////////////////////////////////////////////////
	// PLUGIN JS
	////////////////////////////////////////////////////////////////////////////
	pluginJs.configs.recommended,

	////////////////////////////////////////////////////////////////////////////
	// TSESLINT
	////////////////////////////////////////////////////////////////////////////
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/no-empty-function": "warn",
			"@typescript-eslint/no-unnecessary-type-parameters": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unused-vars": "warn",
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allowArray: true,
					allowNumber: true,
				},
			],
		},
	},

	////////////////////////////////////////////////////////////////////////////
	// PLUGIN IMPORT
	////////////////////////////////////////////////////////////////////////////
	{
		extends: [
			pluginImport.flatConfigs.recommended,
			pluginImport.flatConfigs.typescript,
		],
		rules: {
			"import/extensions": [
				"error",
				"ignorePackages",
				{
					"": "never",
					js: "always",
					jsx: "always",
					ts: "always",
					tsx: "always",
				},
			],
			// "import/enforce-node-protocol-usage": "error",
		},
		settings: {
			"import/parsers": {
				"@typescript-eslint/parser": [".ts", ".tsx"],
			},
			"import/resolver": {
				node: {
					extensions: [".js", ".jsx", ".ts", ".tsx"],
				},
				typescript: {
					alwaysTryTypes: true,
					project: ["**/tsconfig.json"],
				},
			},
		},
	},

	////////////////////////////////////////////////////////////////////////////
	// PERFECTIONIST
	////////////////////////////////////////////////////////////////////////////
	perfectionist.configs["recommended-natural"],
	{
		rules: {
			"perfectionist/sort-imports": [
				"error",
				{
					customGroups: {
						type: {},
						value: {},
					},
					environment: "node",
					groups: [
						"type",
						"builtin",
						"external",
						"internal-type",
						"internal",
						["parent-type", "sibling-type", "index-type"],
						["parent", "sibling", "index"],
						"object",
						"unknown",
					],
					ignoreCase: true,
					internalPattern: ["^~/.+", "^@nexus-cdk/.+"],
					maxLineLength: undefined,
					newlinesBetween: "always",
					order: "asc",
					partitionByComment: false,
					partitionByNewLine: false,
					sortSideEffects: true,
					specialCharacters: "keep",
					type: "natural",
				},
			],
		},
	},
);
