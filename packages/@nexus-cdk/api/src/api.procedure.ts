import type { Context } from "hono";

import assert from "node:assert";
import { fileURLToPath } from "node:url";

import getPort, { portNumbers } from "get-port";

import { procedure, type Procedure } from "@nexus-cdk/procedure";
import { StandardSchemaV1Error } from "@nexus-cdk/procedure";
import { startServer } from "@nexus-cdk/utils";

export const { apiServer } = procedure("apiServer", import.meta.url)
	.context<{
		endpoints: Map<
			string,
			{
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				context: any;
				importFilename: string;
				importName: string;
				type: "mutation" | "query";
			}
		>;
		prefix?: string;
	}>()
	.handler(async (opts) => {
		const now = Date.now();

		const { Hono } = await import("hono");
		const app = new Hono();

		const prefix = opts.ctx.prefix ? `/${opts.ctx.prefix}/` : "";

		for (const [key, value] of opts.ctx.endpoints.entries()) {
			const method = value.type === "mutation" ? "post" : "get";
			app[method](`${prefix}${key}`, async (c) => {
				try {
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete require.cache[fileURLToPath(value.importFilename)];
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
				const mod = await import(value.importFilename);

				const procedure = mod[value.importName] as Procedure;
				assert(
					procedure,
					`Procedure [${value.importName}] is required but not found in [${value.importFilename}]`,
				);
				try {
					const input = await getInput(c);
					const output = await procedure.invoke({
						ctx: value.context,
						input,
					});
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					return c.json(output as any);
				} catch (error) {
					if (error instanceof StandardSchemaV1Error) {
						return c.json(
							{
								issues: error.issues,
							},
							422,
						);
					}
					throw error;
				}
			});
		}

		// console.dir(app.routes, { depth: Number.POSITIVE_INFINITY });

		const port = await getPort({ port: portNumbers(3000, 4000) });
		const server = await startServer(app, port);

		// const endpoint = `${server.endpoint}/${opts.ctx.prefix ?? ""}`;
		const endpoint = server.endpoint;

		const duration = Date.now() - now;
		console.log(`Server started in ${duration}ms`);
		console.log(endpoint);

		return {
			endpoint,
		};
	});

const getInput = async (c: Context) => {
	const text = await c.req.text();
	if (text) {
		return await c.req.json();
	}
	return c.req.query();
};
