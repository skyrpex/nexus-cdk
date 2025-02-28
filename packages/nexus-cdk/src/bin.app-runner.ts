import { exec } from "child_process";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "util";

import { App } from "aws-cdk-lib";
import { type Serializable, stringify } from "devalue-codec";
import { WebSocket } from "ws";

import { ServiceHost } from "@nexus-cdk/service";

const resolveModule = async (
	specifier: string,
	parent: string,
): Promise<string> => {
	try {
		return import.meta.resolve(specifier, parent);
	} catch (error) {
		const { stdout } = await promisify(exec)(
			`${process.execPath} -e 'console.log(import.meta.resolve("${specifier}"))'`,
			{
				cwd: path.dirname(parent),
			},
		);
		return stdout.trim();
	}
};

const [, , filename, wssUrl] = process.argv;
assert(filename);
assert(wssUrl);

const ws = new WebSocket(wssUrl, {
	headers: {
		"x-nexus-cdk-type": "app",
	},
});

const resolvedFilename = path.resolve(process.cwd(), filename);

const { default: app } = await import(resolvedFilename);
assert(App.isApp(app));

// await AsyncDependenciesContext.of(app).waitForAsyncDependencies();

function getProcedureId(procedure: {
	importFilename: string;
	importName: string;
}) {
	const relativeFilename = path.relative(
		process.cwd(),
		fileURLToPath(procedure.importFilename),
	);
	return `${relativeFilename}:${procedure.importName}`;
}

const services = ServiceHost.of(app).services;
const procedures = await Promise.all(
	Array.from(services.values()).map(async (s) => {
		const procedure = await s.procedure;
		return {
			context: s.context,
			importFilename: procedure.importFilename,
			importName: procedure.importName,
			path: s.node.path,
		};
	}),
);

const hashes = new Map<string, string>();

import * as esbuild from "esbuild";
await Promise.all(
	procedures.map(async (procedure) => {
		const now = Date.now();
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
		const after = Date.now();

		const relativeFilename = path.relative(process.cwd(), importFilename);
		// console.log(`Time taken to hash [${relativeFilename}]: ${after - now}ms`);

		const output = build.outputFiles[0];
		assert(output);
		// console.log(`Hash for [${relativeFilename}]: ${output.hash}`);

		hashes.set(getProcedureId(procedure), output.hash);
	}),
);

await new Promise<void>((resolve, reject) => {
	if (ws.readyState === WebSocket.OPEN) {
		resolve();
	} else {
		ws.on("open", () => {
			resolve();
		});
		ws.on("error", reject);
	}
});

ws.send(
	stringify(
		procedures.map((procedure) => ({
			...procedure,
			hash: hashes.get(getProcedureId(procedure)),
			// eslint-disable-next-line @typescript-eslint/no-deprecated
		})) as unknown as Serializable,
	),
);
ws.close();
