import assert from "node:assert";

import {
	parse,
	type Serializable,
	type Stringified,
	stringify,
} from "devalue-codec";
import getPort, { portNumbers } from "get-port";

import { type Procedure, procedure } from "@nexus-cdk/procedure";
import { startServer } from "@nexus-cdk/utils";

export const { createLambdaServer } = procedure(
	"createLambdaServer",
	import.meta.url,
)
	.context<{
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		context: Serializable;
		importFilename: string;
		importName: string;
	}>()
	.handler(async (opts) => {
		// const { tsImport } = await import("tsx/esm/api");
		const now = Date.now();

		const { Hono } = await import("hono");
		const app = new Hono();

		// invoke
		app.post("/", async (c) => {
			// const mod = await tsImport(opts.ctx.importFilename, import.meta.url);
			const mod = await import(opts.ctx.importFilename);

			const procedure = mod[opts.ctx.importName] as Procedure<{
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				context: Serializable;
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				input: Serializable;
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				output: Serializable;
			}>;
			assert(
				procedure,
				`Procedure [${opts.ctx.importName}] is required but not found in [${opts.ctx.importFilename}]`,
			);
			const raw = await c.req.text();
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const input = parse(raw as Stringified<Serializable>);
			const output = await procedure.invoke({
				ctx: opts.ctx.context,
				input,
			});
			return c.text(stringify(output));
		});

		// public url
		app.get("/", async (c) => {
			// const mod = await tsImport(opts.ctx.importFilename, import.meta.url);
			const mod = await import(opts.ctx.importFilename);

			const procedure = mod[opts.ctx.importName] as Procedure;
			assert(
				procedure,
				`Procedure [${opts.ctx.importName}] is required but not found in [${opts.ctx.importFilename}]`,
			);
			const input = c.req.header("Content-Type")
				? await c.req.json()
				: undefined;
			const output = await procedure.invoke({
				ctx: opts.ctx.context,
				input,
			});
			// TODO: Use valibot to parse the output
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return c.json((output as any).body, (output as any)?.status);
		});

		const port = await getPort({ port: portNumbers(3000, 4000) });
		const { endpoint } = await startServer(app, port);

		const duration = Date.now() - now;
		console.log(`Server started in ${duration}ms`);
		console.log(endpoint);

		return {
			endpoint,
		};
	});
