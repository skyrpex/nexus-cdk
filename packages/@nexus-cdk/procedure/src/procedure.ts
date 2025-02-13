/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { Apply, Assume, HKT } from "./hkt.ts";

export interface BuiltProcedureDef {
	context: unknown;
	input: unknown;
	output: unknown;
}

export type InferProcedureContext<T> = T extends { context: infer Context }
	? Context
	: undefined;

export type InferProcedureInput<T> = T extends { input: infer Input }
	? Input
	: never;

export type InferProcedureOutput<T> = T extends { output: infer Output }
	? Output
	: never;

export interface Procedure<T extends BuiltProcedureDef = BuiltProcedureDef> {
	importFilename: string;
	importName: string;
	invoke(opts: {
		ctx: T["context"];
		input: T["input"];
	}): MaybePromise<T["output"]>;
}

type MaybePromise<TValue> = Promise<TValue> | TValue;

export const unsetMarker = Symbol();
export type UnsetMarker = typeof unsetMarker;

type AnyProcedureBuilder = ProcedureBuilder<any, any, any, any, any, any, any>;

type AnyProcedureBuilderDef = ProcedureBuilderDef<any, any>;

type AnyResolver = ProcedureResolver<any, any, any, any>;

type ContainsNever<T> = [T] extends [never]
	? true
	: T extends object
		? { [K in keyof T]: ContainsNever<T[K]> }[keyof T] extends true
			? true
			: false
		: false;

// type CheckSchemaInputOrNever<Check extends HKT, T> = T extends StandardSchemaV1
// 	? Apply<Check, StandardSchemaV1.InferInput<T>> extends never
// 		? never
// 		: T
// 	: never;

type CheckSchemaInputOrNever<Check extends HKT, T> = T extends StandardSchemaV1
	? ContainsNever<Apply<Check, StandardSchemaV1.InferInput<T>>> extends true
		? never
		: T
	: never;

type CheckSchemaOutputOrNever<Check extends HKT, T> = T extends StandardSchemaV1
	? ContainsNever<Apply<Check, StandardSchemaV1.InferOutput<T>>> extends true
		? never
		: T
	: never;

type DefaultValue<TValue, TFallback> = TValue extends UnsetMarker
	? TFallback
	: TValue;

interface ProcedureBuilder<
	Check extends HKT,
	ExportName extends string,
	TContext,
	TInputIn,
	TInputOut,
	TOutputIn,
	TOutputOut,
> {
	context<NewContext>(): ProcedureBuilder<
		Check,
		ExportName,
		NewContext,
		TInputIn,
		TInputOut,
		TOutputIn,
		TOutputOut
	>;
	def: ProcedureBuilderDef<Check, TContext>;
	handler<$Output>(
		resolver: ProcedureResolver<
			TContext,
			TInputOut,
			TOutputIn,
			Apply<Check, $Output>
		>,
	): ProcedureRecord<
		ExportName,
		Procedure<{
			context: DefaultValue<TContext, object>;
			input: DefaultValue<TInputIn, void>;
			output: DefaultValue<TOutputOut, $Output>;
		}>
	>;
	input<InputSchema extends StandardSchemaV1>(
		schema: CheckSchemaInputOrNever<Check, InputSchema>,
	): ProcedureBuilder<
		Check,
		ExportName,
		TContext,
		StandardSchemaV1.InferInput<InputSchema>,
		StandardSchemaV1.InferOutput<InputSchema>,
		TOutputIn,
		TOutputOut
	>;
	output<OutputSchema extends StandardSchemaV1>(
		schema: CheckSchemaOutputOrNever<Check, OutputSchema>,
	): ProcedureBuilder<
		Check,
		ExportName,
		TContext,
		TInputIn,
		TInputOut,
		StandardSchemaV1.InferInput<OutputSchema>,
		StandardSchemaV1.InferOutput<OutputSchema>
	>;
}

interface ProcedureBuilderDef<
	// ExportName extends string,
	Check extends HKT,
	Context,
	// Input extends StandardSchemaV1<Serializable, unknown>,
	// Output extends StandardSchemaV1<unknown, Serializable>,
> {
	importMetaURL: string;
	importName: string;
	inputSchema?: StandardSchemaV1;
	outputSchema?: StandardSchemaV1;
}

type ProcedureRecord<ExportName extends string, T> = Record<ExportName, T>;

type ProcedureResolver<TContext, TInputOut, TOutputParserIn, $Output> = (
	opts: ProcedureResolverOptions<TContext, TInputOut>,
) => MaybePromise<
	// If an output parser is defined, we need to return what the parser expects, otherwise we return the inferred type
	DefaultValue<TOutputParserIn, $Output>
>;

interface ProcedureResolverOptions<TContext, TInputOut> {
	ctx: Simplify<TContext>;
	input: TInputOut extends UnsetMarker ? undefined : TInputOut;
}

type Simplify<TType> = TType extends any[] | Date
	? TType
	: { [K in keyof TType]: TType[K] };

interface CheckAnyHKT extends HKT {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	apply: (value: Assume<this["_1"], any>) => typeof value;
}

export function createBuilder<Serializable extends HKT = CheckAnyHKT>() {
	return <ImportName extends string>(
		importName: ImportName,
		importMetaURL: string,
	) => {
		return createBuilderInternal<Serializable, ImportName>({
			importMetaURL,
			importName,
		});
	};
}

function createBuilderInternal<
	Serializable extends HKT,
	ImportName extends string,
>(
	def: AnyProcedureBuilderDef,
): ProcedureBuilder<
	Serializable,
	ImportName,
	object,
	UnsetMarker,
	UnsetMarker,
	UnsetMarker,
	UnsetMarker
> {
	const builder: AnyProcedureBuilder = {
		context: () => createNewBuilder(def, {}),
		def,
		handler: (resolver) => {
			return {
				[def.importName]: createResolver(def, resolver),
			};
		},
		input: (schema) => createNewBuilder(def, { inputSchema: schema }),
		output: (schema) => createNewBuilder(def, { outputSchema: schema }),
	};

	return builder as ProcedureBuilder<
		Serializable,
		ImportName,
		object,
		UnsetMarker,
		UnsetMarker,
		UnsetMarker,
		UnsetMarker
	>;
}

function createNewBuilder(
	def1: AnyProcedureBuilderDef,
	def2: Partial<AnyProcedureBuilderDef>,
): AnyProcedureBuilder {
	return createBuilderInternal({
		...def1,
		...def2,
	});
}

import { StandardSchemaV1Error } from "./standard-schema-error.ts";

function createResolver(
	def: AnyProcedureBuilderDef,
	resolver: AnyResolver,
): Procedure<any> {
	return {
		importFilename: def.importMetaURL,
		importName: def.importName,
		invoke: async (opts) => {
			const input = def.inputSchema
				? await validate(def.inputSchema, opts.input)
				: opts.input;
			const output = await resolver({
				ctx: opts.ctx,
				input,
			});

			return def.outputSchema
				? await validate(def.outputSchema, output)
				: output;
		},
	};
}

async function validate(schema: StandardSchemaV1, value: unknown) {
	const result = await schema["~standard"].validate(value);
	if (result.issues) {
		throw new StandardSchemaV1Error(result.issues);
	}
	return result.value;
}
