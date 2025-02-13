import { Construct } from "constructs";

import type {
	BuiltProcedureDef,
	InferProcedureContext,
	InferProcedureOutput,
	Procedure,
} from "@nexus-cdk/procedure";

import { TokensHost } from "@nexus-cdk/tokens";

export type ServiceProps<T extends BuiltProcedureDef> =
	(InferProcedureContext<T> extends undefined
		? {
				readonly context?: undefined;
			}
		: {
				readonly context: InferProcedureContext<T>;
			}) & {
		readonly procedure: Procedure<T> | Promise<Procedure<T>>;
	};

// export type ServiceProps<T extends BuiltProcedureDef> = T extends {
// 	input: infer Input;
// }
// 	? never
// 	: {
// 			readonly procedure: Procedure<T> | Promise<Procedure<T>>;
// 		} & (InferProcedureContext<T> extends undefined
// 			? {
// 					readonly context?: undefined;
// 				}
// 			: {
// 					readonly context: InferProcedureContext<T>;
// 				});

interface ServiceProcedureDef {
	context: unknown;
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	input: void;
	output: unknown;
}

/**
 * Invokes the procedure as a service.
 *
 * - Service procedures can't have inputs.
 */
export class Service<
	T extends ServiceProcedureDef = ServiceProcedureDef,
> extends Construct {
	readonly context: InferProcedureContext<T>;
	readonly outputs: InferProcedureOutput<T>;
	readonly procedure: Promise<Procedure<T>>;

	constructor(scope: Construct, id: string, props: ServiceProps<T>) {
		super(scope, id);

		this.procedure = Promise.resolve(props.procedure);

		this.context = props.context as InferProcedureContext<T>;

		const host = ServiceHost.of(this);
		host.services.set(this.node.path, this);

		const tokens = TokensHost.of(this);
		this.outputs = new Proxy(
			{},
			{
				get: (target, prop) => {
					const token = tokens.token(this.node.path, String(prop));
					return token.id;
				},
			},
		) as InferProcedureOutput<T>;
	}

	static isService(construct: Construct): construct is Service {
		return construct instanceof Service;
	}
}

export class ServiceHost extends Construct {
	readonly services = new Map<string, Service>();

	private constructor(scope: Construct, id: string) {
		super(scope, id);
	}

	static of(scope: Construct): ServiceHost {
		const id = "nexus-ServiceHost-uhjO7fLQFr";
		const root = scope.node.root;
		return (
			(root.node.tryFindChild(id) as ServiceHost | undefined) ??
			new ServiceHost(root, id)
		);
	}
}
