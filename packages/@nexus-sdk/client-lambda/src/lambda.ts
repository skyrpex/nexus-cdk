import * as devalue from "devalue";

import type { LambdaEndpoint } from "@nexus-cdk/lambda";
import type {
	BuiltProcedureDef,
	InferProcedureInput,
	InferProcedureOutput,
} from "@nexus-cdk/procedure";

interface LambdaClientResponse<T> {
	readonly json: () => Promise<T>;
	readonly ok: boolean;
}

export class LambdaClient<T extends BuiltProcedureDef> {
	constructor(private readonly endpoint: LambdaEndpoint<T>) {}

	async invoke(
		input: InferProcedureInput<T>,
	): Promise<LambdaClientResponse<InferProcedureOutput<T>>> {
		const response = await fetch(this.endpoint, {
			body: devalue.stringify(input),
			method: "POST",
		});
		return {
			json: async () => {
				const text = await response.text();
				return devalue.parse(text) as InferProcedureOutput<T>;
			},
			ok: response.ok,
		};
	}
}
