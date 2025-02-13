import type { Hono } from "hono";

import { addressInfoToURL } from "./address-info-to-url.ts";
import { nodeExecutor } from "./node-executor.ts";

export const startServer = async (app: Hono, port: number) => {
	if (nodeExecutor === "node") {
		const { serve } = await import("@hono/node-server");
		const server = serve({
			fetch: app.fetch,
			port,
		});
		await new Promise<void>((resolve) => {
			server.on("listening", () => {
				resolve();
			});
		});
		const endpoint = addressInfoToURL(server.address(), "http");
		return {
			endpoint,
		};
	}

	if (nodeExecutor === "bun") {
		const server = Bun.serve({
			fetch: app.fetch,
			port,
		});

		const endpoint = `http://localhost:${server.port}`;
		return {
			endpoint,
		};
	}

	// @ts-expect-error haven't imported deno types

	const server = Deno.serve({ port }, app.fetch);
	const endpoint = `http://localhost:${port}`;
	return {
		endpoint,
	};
};
