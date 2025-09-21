import assert from "node:assert";
import { fileURLToPath } from "node:url";

import { type Serializable, stringify } from "devalue-codec";
import { WebSocket } from "ws";

import type { Procedure } from "@nexus-cdk/procedure";

import { parseProcedureRunnerOptions } from "./procedure.runner.ts";
import { waitForOpen } from "./utils.ws.ts";

const [, , options] = process.argv;
assert(options);

const { constructPath, context, importFilename, importName, wssUrl } =
	parseProcedureRunnerOptions(options);

const ws = new WebSocket(wssUrl, {
	headers: {
		"x-nexus-cdk-construct-path": constructPath,
		"x-nexus-cdk-type": "procedure",
	},
});

// console.log(
// 	`Importing [${importName}] from [${path.relative(process.cwd(), importFilename)}]...`,
// );

const module = await import(fileURLToPath(importFilename));

const procedure: Procedure | undefined = module[importName];
assert(procedure);

// console.log("Running procedure with context:", context);
const output = await procedure.invoke({
	ctx: context,
	input: undefined,
});

// console.log("Output:", output);

await waitForOpen(ws);

// eslint-disable-next-line @typescript-eslint/no-deprecated
ws.send(stringify(output as Serializable));
ws.close();
