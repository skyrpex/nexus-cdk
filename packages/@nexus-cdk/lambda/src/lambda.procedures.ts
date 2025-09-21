import assert from "node:assert";
import { fileURLToPath } from "node:url";

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
			try {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete require.cache[fileURLToPath(opts.ctx.importFilename)];
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes("require is not defined")
				) {
					// Just ignore it.
				} else {
					throw error;
				}
			}

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
			try {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete require.cache[fileURLToPath(opts.ctx.importFilename)];
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes("require is not defined")
				) {
					// Just ignore it.
				} else {
					throw error;
				}
			}
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

		// TODO: Implement a port allocator that handles race conditions
		// const port = await getPort({ port: portNumbers(3000, 4000) });
		const port = await getPort();
		const { endpoint } = await startServer(app, port);

		const duration = Date.now() - now;
		console.log(`Server started in ${duration}ms`);
		console.log(endpoint);

		return {
			endpoint,
		};
	});
