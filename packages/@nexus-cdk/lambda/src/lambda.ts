import type { Serializable } from "devalue-codec";

import * as aws_lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

import type {
	BuiltProcedureDef,
	InferProcedureInput,
	InferProcedureOutput,
} from "@nexus-cdk/procedure";

import { Service } from "@nexus-cdk/service";
import { NEXUS_CDK_MODE } from "@nexus-cdk/utils";

import type { ILambda, LambdaEndpoint, LambdaProps } from "./lambda.types.ts";

import { EsbuildBundling } from "./aws/esbuild-bundling.ts";
import { createLambdaServer } from "./lambda.procedures.ts";

export class Lambda<T extends BuiltProcedureDef>
	extends Construct
	implements ILambda<T>
{
	readonly endpoint: LambdaEndpoint<{
		input: InferProcedureInput<T>;
		output: InferProcedureOutput<T>;
	}>;
	constructor(scope: Construct, id: string, props: LambdaProps<T>) {
		super(scope, id);

		if (NEXUS_CDK_MODE === "synth") {
			const fn = new aws_lambda.Function(this, "Function", {
				code: EsbuildBundling.bundle({
					stdin: {
						contents: [
							`import { ${props.procedure.importName} as procedure } from "${props.procedure.importFilename}";`,
							"export const handler = async (event, context) => {",
							"\tconsole.log(event, context);",
							"\treturn await procedure.run();",
							"};",
						].join("\n"),
						resolveDir: import.meta.dirname,
					},
				}),
				handler: "index.handler",
				memorySize: 1024,
				runtime: aws_lambda.Runtime.NODEJS_22_X,
			});
			this.endpoint = fn.functionArn as LambdaEndpoint<{
				input: InferProcedureInput<T>;
				output: InferProcedureOutput<T>;
			}>;
		} else {
			const service = new Service(this, "Service", {
				context: {
					context: props.context as Serializable,
					importFilename: props.procedure.importFilename,
					importName: props.procedure.importName,
				},
				procedure: createLambdaServer,
			});
			this.endpoint = service.outputs.endpoint as LambdaEndpoint<{
				input: InferProcedureInput<T>;
				output: InferProcedureOutput<T>;
			}>;
		}
	}
}
