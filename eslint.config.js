import js from "@eslint/js";
import query from "@tanstack/eslint-plugin-query";
import * as pluginImport from "eslint-plugin-import";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig } from "eslint/config";
import globals from "globals";
import { configs } from "typescript-eslint";

export default defineConfig(
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
	// PLUGIN QUERY (TANSTACK)
	////////////////////////////////////////////////////////////////////////////
	...query.configs["flat/recommended"],

	////////////////////////////////////////////////////////////////////////////
	// PLUGIN JS
	////////////////////////////////////////////////////////////////////////////
	js.configs.recommended,
	{
		rules: {
			"func-style": ["error", "expression"],
		},
	},

	////////////////////////////////////////////////////////////////////////////
	// TSESLINT
	////////////////////////////////////////////////////////////////////////////
	configs.strictTypeChecked,
	configs.stylisticTypeChecked,
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
			"import/no-unresolved": [
				"error",
				{
					ignore: ["^bun:test$"],
				},
			],
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
