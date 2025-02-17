import assert from "node:assert";

import getPort, { portNumbers } from "get-port";

import { procedure } from "@nexus-cdk/procedure";

import type { ViteProps } from "./vite.types.ts";

export const { viteProcedure } = procedure("viteProcedure", import.meta.url)
	.context<ViteProps>()
	.handler(async (opts) => {
		const { createServer } = await import("vite");
		const port = await getPort({
			port: portNumbers(3000, 4000),
		});
		for (const [key, value] of Object.entries(opts.ctx.environment ?? {})) {
			process.env[key] = value;
		}
		const server = await createServer({
			define: opts.ctx.define,
			root: opts.ctx.root,
			server: {
				port,
				proxy: opts.ctx.proxy,
				strictPort: true,
			},
		});

		await server.listen();

		server.printUrls();

		server.openBrowser();

		const url = server.resolvedUrls?.local[0];
		assert(url);

		return {
			url,
		};
	});
