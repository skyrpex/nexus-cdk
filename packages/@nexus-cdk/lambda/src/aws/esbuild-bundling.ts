import path from "node:path";

import * as cdk from "aws-cdk-lib";
import { type AssetCode, Code } from "aws-cdk-lib/aws-lambda";
import * as esbuild from "esbuild";
import { findUpSync } from "find-up";

const lockFileNames = [
	"package-lock.json",
	"yarn.lock",
	"pnpm-lock.yaml",
	"bun.lock",
];

const findDepsLockFilePath = (input: string) => {
	const lockFilePath = findUpSync(lockFileNames, {
		cwd: input,
	});

	if (!lockFilePath) {
		throw new Error(`Couldn't find a lock file (${lockFileNames.join(", ")})`);
	}

	return lockFilePath;
};

// /**
//  * Converts a Lambda runtime to an esbuild node target.
//  */
// function toTarget(runtime: Runtime): string {
//   const match = runtime.name.match(/nodejs(\d+)/)

//   if (!match) throw new Error("Cannot extract version from runtime.")

//   return `node${match[1]}`
// }

export interface EsbuildBundlingProps {
	define?: Record<string, string>;
	// runtime: Runtime
	external?: string[];
	// input: string
	// stdin: esbuild.StdinOptions
	stdin: {
		contents: string;
		resolveDir: string;
	};
}

export class EsbuildBundling {
	public readonly image: cdk.DockerImage;

	public readonly local: cdk.ILocalBundling;

	constructor(private readonly properties: EsbuildBundlingProps) {
		this.image = cdk.DockerImage.fromRegistry("dummy");
		this.local = {
			tryBundle(outputDirectory) {
				console.log(outputDirectory);
				esbuild.buildSync({
					bundle: true,
					define: properties.define,
					external: [
						// "aws-sdk",
						// "@aws-sdk/*",
						// "@smithy/*",
						...(properties.external ?? []),
					],
					format: "esm",
					outfile: `${outputDirectory}/index.mjs`,
					platform: "node",
					stdin: properties.stdin,
					// mainFields: ["module", "main"],
					target: "node22",
					// minify: true,
				});
				return true;
			},
		};
	}

	public static bundle(options: EsbuildBundlingProps): AssetCode {
		// const depsLockFilePath = findDepsLockFilePath(options.input)
		const depsLockFilePath = findDepsLockFilePath(options.stdin.resolveDir);
		// console.log({ depsLockFilePath })

		return Code.fromAsset(path.dirname(depsLockFilePath), {
			assetHashType: cdk.AssetHashType.OUTPUT,
			bundling: new EsbuildBundling(options),
		});
	}
}
