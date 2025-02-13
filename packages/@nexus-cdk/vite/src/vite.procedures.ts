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
		const server = await createServer({
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
