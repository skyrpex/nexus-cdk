import assert from "node:assert";
import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { App } from "aws-cdk-lib";
import {
	parse,
	type Serializable,
	type Stringified,
	stringify,
} from "devalue-codec";
import Emittery from "emittery";
import { WebSocketServer } from "ws";

import { getTokensFromString, type Token, TokensHost } from "@nexus-cdk/tokens";
import { addressInfoToURL } from "@nexus-cdk/utils";

import { spawnProcedure } from "./procedure.runner.ts";
import { diff } from "./utils.diff.ts";
import { getSpawnNodeTypescriptOptions } from "./utils/spawn-node-typescript.ts";

const diffServices = (
	previous: Map<string, ServiceDetails>,
	current: Map<string, ServiceDetails>,
) => {
	const added = new Map<string, ServiceDetails>();
	for (const [key, service] of current) {
		if (!previous.has(key)) {
			added.set(key, service);
		}
	}

	const removed = new Map<string, ServiceDetails>();
	for (const [key, service] of previous) {
		if (!current.has(key)) {
			removed.set(key, service);
		}
	}

	const changed = new Map<string, ServiceDetails>();
	for (const [key, service] of current) {
		const previousService = previous.get(key);
		if (!previousService) {
			continue;
		}

		if (diff(service, previousService)) {
			changed.set(key, service);
		}
	}

	return { added, changed, removed };
};

const {
	positionals: [mode, app],
} = parseArgs({
	allowPositionals: true,
});

if (!mode) {
	throw new Error("Missing mode. Usage: nexus-cdk dev|synth index.ts");
}

if (!app) {
	throw new Error("Missing app. Usage: nexus-cdk dev|synth index.ts");
}

const resolvedFilename = path.resolve(process.cwd(), app);

if (mode === "synth") {
	process.env.CDK_OUTDIR = `${process.cwd()}/cdk.out`;
	process.env.NEXUS_CDK_MODE = "synth";
	const { default: app } = await import(resolvedFilename);
	assert(App.isApp(app));

	app.synth();
	process.exit(0);
}

interface ServiceDetails {
	context: {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		context: Record<string, Serializable> | undefined;
		importFilename: string;
		importName: string;
	};
	hash: string;
	importFilename: string;
	importName: string;
	path: string;
}

let previousServices = new Map<string, ServiceDetails>();
const processes = new Map<string, ChildProcess>();
const tokenValues = new Map<string, Token>();
const dependencies = new Map<string, Set<string>>();
const emittery = new Emittery<Record<string, Token>>();

const startProcedures = async (procedures: ServiceDetails[]) => {
	const now = Date.now();

	const services = new Map(procedures.map((p) => [p.path, p]));

	const { added, changed, removed } = diffServices(previousServices, services);

	const toDelete = new Set([...changed.keys(), ...removed.keys()]);
	const toCreate = new Set([...added.values(), ...changed.values()]);

	// Add service dependants to toDelete
	const addToDeleteDependants = (constructPath: string) => {
		const dependants = Array.from(dependencies.get(constructPath) ?? []);
		for (const dependant of dependants) {
			toDelete.add(dependant);

			// If the service existed before, create it again afterwards.
			const service = previousServices.get(dependant);
			if (service) {
				toCreate.add(service);
			}
			addToDeleteDependants(dependant);
		}
	};
	for (const constructPath of toDelete) {
		addToDeleteDependants(constructPath);
	}

	// DELETE PROCESSES
	console.log("Deleting", toDelete.size, "services...");
	const deletedSet = new Set<string>();
	const deletedEmittery = new Emittery<Record<string, void>>();
	await Promise.all(
		Array.from(toDelete).map(async (constructPath) => {
			const service = previousServices.get(constructPath);
			assert(service);

			const parentDependencies = Array.from(
				dependencies.get(constructPath) ?? [],
			);
			if (parentDependencies.length === 0) {
				console.log(`[${constructPath}] No dependant services to wait for.`);
			} else {
				console.log(
					`[${constructPath}] Waiting for dependant services (${parentDependencies}) to be deleted...`,
				);
				await Promise.all(
					parentDependencies.map(async (dependency) => {
						if (deletedSet.has(dependency)) {
							return;
						}
						await deletedEmittery.once(dependency);
					}),
				);
				console.log(`[${constructPath}] Dependant services deleted.`);
			}

			console.log(`[${constructPath}] Deleting service...`);

			const child = processes.get(constructPath);
			if (!child) {
				console.log(`[${constructPath}] Process already exited`);
			} else {
				console.log(`[${constructPath}] Killing process...`);
				child.kill("SIGINT");
				await new Promise<void>((resolve) => {
					child.on("close", () => {
						resolve();
					});
				});
				processes.delete(constructPath);
			}

			// DELETE TOKENS
			for (const [tokenId, token] of tokenValues) {
				if (token.constructPath === constructPath) {
					tokenValues.delete(tokenId);
				}
			}

			deletedSet.add(constructPath);
			await deletedEmittery.emit(constructPath);
		}),
	);
	previousServices = new Map(services);

	console.log("Creating", toCreate.size, "services...");
	await Promise.all(
		Array.from(toCreate).map(async (service) => {
			const { importFilename, importName } = service;
			const stringifiedContext = stringify(service.context);
			const necessaryTokens = getTokensFromString(stringifiedContext);

			const resolvedTokens = await Promise.all(
				Array.from(necessaryTokens).map(async (tokenId) => {
					return tokenValues.get(tokenId) ?? (await emittery.once(tokenId));
				}),
			);

			for (const token of resolvedTokens) {
				const serviceDependencies =
					dependencies.get(token.constructPath) ?? new Set();
				serviceDependencies.add(service.path);
				dependencies.set(token.constructPath, serviceDependencies);
			}

			let resolvedContext = stringifiedContext;
			for (const token of resolvedTokens) {
				resolvedContext = resolvedContext.replaceAll(
					token.id,
					String(token.value),
				) as typeof resolvedContext;
			}

			const child = spawnProcedure({
				constructPath: service.path,

				// eslint-disable-next-line @typescript-eslint/no-deprecated
				context: parse(resolvedContext) as unknown as Serializable,
				importFilename,
				importName,
				wssUrl,
			});
			processes.set(service.path, child);
			child.stdout.on("data", (data: Buffer) => {
				for (const line of data.toString().split("\n")) {
					if (line.trim()) {
						console.log(`[${service.path}] ${line}`);
					}
				}
			});
			child.stderr.on("data", (data: Buffer) => {
				for (const line of data.toString().split("\n")) {
					if (line.trim()) {
						console.error(`[${service.path}] ${line}`);
					}
				}
			});
			child.on("close", (code) => {
				console.log(`[${service.path}] Process exited with code ${code}`);
				processes.delete(service.path);
			});
		}),
	);

	// await Promise.all(
	// 	Array.from(tokenValues.keys()).map(async (tokenId) => {
	// 		return tokenValues.get(tokenId) ?? (await emittery.once(tokenId));
	// 	}),
	// );

	const duration = Date.now() - now;
	console.log(
		`Stopped ${toDelete.size} services and started ${toCreate.size} services in ${duration}ms`,
	);
	console.log();
};

const wss = new WebSocketServer({ port: 0 });
const wssUrl = await new Promise<string>((resolve) => {
	wss.once("listening", () => {
		resolve(addressInfoToURL(wss.address(), "ws"));
	});
});
wss.on("connection", (ws, req) => {
	const type = req.headers["x-nexus-cdk-type"]?.toString();
	if (type === "app") {
		ws.on("message", (data: Buffer) => {
			ws.close();
			const procedures = parse(
				data.toString() as Stringified<ServiceDetails[]>,
			);
			// console.log("Received procedures:", procedures);
			void startProcedures(procedures);
		});
	} else if (type === "procedure") {
		const constructPath = req.headers["x-nexus-cdk-construct-path"]?.toString();
		assert(constructPath, "Missing [x-nexus-cdk-construct-path] header");
		ws.on("message", (data: Buffer) => {
			const output = parse(
				data.toString() as Stringified<Record<string, unknown> | undefined>,
			);
			for (const [prop, value] of Object.entries(output ?? {})) {
				const token = TokensHost.of(
					new App({
						autoSynth: false,
					}),
				).token(constructPath, prop);

				token.value = String(value);
				tokenValues.set(token.id, token);
				void emittery.emit(token.id, token);
			}
			ws.close();
		});
	} else {
		throw new Error(`Unknown type: ${type}`);
	}
});

spawn(
	...getSpawnNodeTypescriptOptions({
		args: [resolvedFilename, wssUrl],
		filename: fileURLToPath(import.meta.resolve("./bin.app-runner.ts")),
		watch: true,
	}),
	{
		env: {
			...process.env,
			NEXUS_CDK_MODE: "local",
		},
		stdio: "inherit",
	},
);
