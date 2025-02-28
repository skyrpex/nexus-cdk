/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as jsonCodec from "json-codec";

import { Construct } from "constructs";

import { Lambda } from "@nexus-cdk/lambda";
import {
	type Assume,
	type BuiltProcedureDef,
	createBuilder,
	type HKT,
	type Procedure,
} from "@nexus-cdk/procedure";
import { Service } from "@nexus-cdk/service";

import { apiServer } from "./api.procedure.ts";

export interface EndpointDef {
	input: unknown;
	output: unknown;
	type: EndpointType;
}

export type InferApi<T> = T extends Api<infer U> ? U : never;

type EndpointType = "mutation" | "query";

interface JsonSerializableHKT extends HKT {
	apply: (value: Assume<this["_1"], any>) => jsonCodec.Check<typeof value>;
}

export class Api<T extends Record<string, EndpointDef>> extends Construct {
	readonly endpoint: string;

	private constructor(
		scope: Construct,
		id: string,
		options: {
			endpoints: Record<string, Mutation<any> | Query<any>>;
			prefix?: string;
		},
	) {
		super(scope, id);

		const service = new Service(this, "Service", {
			context: {
				endpoints: new Map(
					Object.entries(options.endpoints).map(([key, value]) => [
						key,
						{
							connectionString: value.connectionString,
							type: value.type,
						},
					]),
				) as Map<
					string,
					{
						connectionString: string;
						type: "mutation" | "query";
					}
				>,
				prefix: options.prefix,
			},
			procedure: apiServer,
		});

		this.endpoint = service.outputs.endpoint;
	}

	static fromEndpoints<T extends Record<string, Mutation<any> | Query<any>>>(
		scope: Construct,
		id: string,
		options: {
			endpoints: T;
			prefix?: string;
		},
	): Api<{
		[K in keyof T]: T[K] extends Mutation<infer U>
			? {
					input: U["input"];
					output: U["output"];
					type: "mutation";
				}
			: T[K] extends Query<infer U>
				? {
						input: U["input"];
						output: U["output"];
						type: "query";
					}
				: never;
	}> {
		return new Api(scope, id, options);
	}
}

export const endpointProcedure = createBuilder<JsonSerializableHKT>();

export interface MutationProps<T extends BuiltProcedureDef> {
	context: T["context"];
	procedure: Procedure<T>;
}

export interface QueryProps<T extends BuiltProcedureDef> {
	context: T["context"];
	procedure: Procedure<T>;
}

export class Mutation<T extends BuiltProcedureDef> extends Construct {
	readonly connectionString: string;
	readonly type = "mutation";
	constructor(scope: Construct, id: string, props: MutationProps<T>) {
		super(scope, id);

		const lambda = new Lambda(this, "Lambda", {
			context: props.context as any,
			procedure: props.procedure,
		});

		this.connectionString = lambda.endpoint;
	}
}

export class Query<T extends BuiltProcedureDef> extends Construct {
	readonly connectionString: string;
	readonly type = "query";
	constructor(scope: Construct, id: string, props: QueryProps<T>) {
		super(scope, id);

		const lambda = new Lambda(this, "Lambda", {
			context: props.context as any,
			procedure: props.procedure,
		});

		this.connectionString = lambda.endpoint;
	}
}
