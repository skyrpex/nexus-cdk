import type { Construct } from "constructs";

import type {
	BuiltProcedureDef,
	InferProcedureContext,
	InferProcedureInput,
	InferProcedureOutput,
	Procedure,
} from "@nexus-cdk/procedure";

declare const type: unique symbol;
export interface ILambda<T extends BuiltProcedureDef> extends Construct {
	readonly endpoint: LambdaEndpoint<{
		input: InferProcedureInput<T>;
		output: InferProcedureOutput<T>;
	}>;
}

export type InferLambdaEndpoint<T> =
	T extends Procedure<infer U>
		? U extends {
				input: infer I;
				output: infer O;
			}
			? LambdaEndpoint<{ input: I; output: O }>
			: T extends BuiltProcedureDef
				? LambdaEndpoint<T>
				: never
		: never;

export type LambdaEndpoint<T extends { input: unknown; output: unknown }> =
	string & {
		readonly [type]: {
			readonly input: InferProcedureInput<T>;
			readonly output: InferProcedureOutput<T>;
		};
	};

export type LambdaProps<T extends BuiltProcedureDef> =
	(InferProcedureContext<T> extends undefined
		? {
				readonly context?: undefined;
			}
		: {
				readonly context: InferProcedureContext<T>;
			}) & {
		readonly procedure: Procedure<T>;
	};
