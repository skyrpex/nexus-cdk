import { exec } from "child_process";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "util";

import * as esbuild from "esbuild";

const resolveModule = async (
	specifier: string,
	parent: string,
): Promise<string> => {
	try {
		return import.meta.resolve(specifier, parent);
	} catch {
		const { stdout } = await promisify(exec)(
			`${process.execPath} -e 'console.log(import.meta.resolve("${specifier}"))'`,
			{
				cwd: path.dirname(parent),
			},
		);
		return stdout.trim();
	}
};

export async function getProcedureHash(
	procedure: {
		importFilename: string;
		importName: string;
	},
	resolvedFilename: string,
): Promise<string> {
	const importFilename = fileURLToPath(procedure.importFilename);
	const virtualFileContent = `
		export { ${procedure.importName} as procedure } from '${importFilename}';
		`;
	const build = await esbuild.build({
		bundle: true,
		format: "esm",
		platform: "node",
		plugins: [
			{
				name: "externals",
				setup(build) {
					build.onResolve({ filter: /.*/ }, async (args) => {
						if (!/^(#|\/|\.\/|\.\.\/)/.test(args.path)) {
							const resolved = await resolveModule(args.path, args.importer);
							if (resolved.includes("/node_modules/")) {
								return { external: true };
							}
						}

						if (args.path.startsWith("bun:")) {
							return { external: true };
						}

						return undefined;
					});
				},
			},
		],
		stdin: {
			contents: virtualFileContent,
			loader: "ts",
			resolveDir: process.cwd(),
			sourcefile: resolvedFilename,
		},
		target: "node22",
		write: false,
	});

	const output = build.outputFiles[0];
	assert(output);
	return output.hash;
}

export function getProcedureId(procedure: {
	importFilename: string;
	importName: string;
}) {
	const relativeFilename = path.relative(
		process.cwd(),
		fileURLToPath(procedure.importFilename),
	);
	return `${relativeFilename}:${procedure.importName}`;
}
