import { fileURLToPath } from "node:url";

import { nodeExecutor } from "@nexus-cdk/utils";

export interface SpawnNodeTypescriptOptions {
	args?: string[];
	filename: string;
	watch?: boolean;
}

export const getSpawnNodeTypescriptOptions = (
	options: SpawnNodeTypescriptOptions,
): [string, string[]] => {
	if (nodeExecutor === "node") {
		return [
			process.execPath,
			[
				fileURLToPath(import.meta.resolve("tsx/cli")),
				...(options.watch ? ["watch", "--clear-screen=false", "--"] : []),
				options.filename,
				...(options.args ?? []),
			],
		];
	}

	if (nodeExecutor === "bun") {
		return [
			process.execPath,
			[
				...(options.watch ? ["--watch", "--no-clear-screen", "--"] : []),
				options.filename,
				...(options.args ?? []),
			],
		];
	}

	return [
		process.execPath,
		[
			...(options.watch ? ["--watch"] : []),
			options.filename,
			...(options.args ?? []),
		],
	];
};
