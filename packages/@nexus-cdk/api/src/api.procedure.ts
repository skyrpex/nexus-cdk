import type { Context } from "hono";

import { LambdaClient } from "@nexus-sdk/client-lambda";
import getPort, { portNumbers } from "get-port";

import { procedure , StandardSchemaV1Error } from "@nexus-cdk/procedure";
import { startServer } from "@nexus-cdk/utils";

export const { apiServer } = procedure("apiServer", import.meta.url)
	.context<{
		endpoints: Map<
			string,
			{
				connectionString: string;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				context: any;
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
					const input = await getInput(c);
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const lambda = new LambdaClient(value.connectionString as any);
					const response = await lambda.invoke({
						ctx: value.context,
						input,
					});
					const output = await response.json();
					return c.json(output as never);
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
