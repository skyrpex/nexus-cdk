import assert from "node:assert";
import path from "node:path";

import { App } from "aws-cdk-lib";
import { type Serializable, stringify } from "devalue-codec";
import { WebSocket } from "ws";

import { ServiceHost } from "@nexus-cdk/service";

import { getProcedureHash, getProcedureId } from "./utils.procedures.ts";
import { waitForOpen } from "./utils.ws.ts";

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
const services = ServiceHost.of(app).services;
const procedures = await Promise.all(
	Array.from(services.values()).map(async (service) => {
		const procedure = await service.procedure;
		return {
			context: service.context,
			importFilename: procedure.importFilename,
			importName: procedure.importName,
			path: service.node.path,
		};
	}),
);

const hashes = new Map<string, string>();

await Promise.all(
	procedures.map(async (procedure) => {
		const now = Date.now();
		const hash = await getProcedureHash(procedure, resolvedFilename);
		const after = Date.now();

		const relativeFilename = path.relative(
			process.cwd(),
			procedure.importFilename,
		);
		// console.log(`Time taken to hash [${relativeFilename}]: ${after - now}ms`);

		hashes.set(getProcedureId(procedure), hash);
	}),
);

await waitForOpen(ws);

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
