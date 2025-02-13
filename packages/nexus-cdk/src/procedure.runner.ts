import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
	parse,
	type Serializable,
	type Stringified,
	stringify,
} from "devalue-codec";

import { getSpawnNodeTypescriptOptions } from "./utils/spawn-node-typescript.ts";

export interface ProcedureRunnerOptions {
	constructPath: string;
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	context: Serializable;
	importFilename: string;
	importName: string;
	wssUrl: string;
}

export const spawnProcedure = (options: ProcedureRunnerOptions) => {
	return spawn(
		...getSpawnNodeTypescriptOptions({
			args: [stringifyProcedureRunnerOptions(options)],
			filename: fileURLToPath(import.meta.resolve("./bin.procedure-runner.ts")),
		}),
		{
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
};

export const stringifyProcedureRunnerOptions = (
	options: ProcedureRunnerOptions,
) => {
	return stringify(options);
};

export const parseProcedureRunnerOptions = (
	options: string,
): ProcedureRunnerOptions => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return parse(options as unknown as any);
};
