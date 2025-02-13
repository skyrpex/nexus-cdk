import { type Connection as DynamodbConnection } from "@nexus-sdk/lib-dynamodb";
import { Construct } from "constructs";

import { Service } from "@nexus-cdk/service";

import type {
	BaseFields,
	DynamodbTableProps,
	IDynamodbTable,
} from "./dynamodb.types.ts";

import {
	createDynamodbTableProcedure,
	dynamodbHostProcedure,
} from "./dynamodb.procedures.ts";

const DYNAMODB_HOST_ID = "nexus--DynamodbHost-hHg2LuE37F";

class DynamodbHost extends Construct {
	readonly endpoint: string;
	private constructor(scope: Construct, id: string) {
		super(scope, id);

		const service = new Service(this, "Service", {
			context: {},
			procedure: dynamodbHostProcedure,
		});
		this.endpoint = service.outputs.endpoint;
	}

	static of(scope: Construct): DynamodbHost {
		const root = scope.node.root;
		return (
			(root.node.tryFindChild(DYNAMODB_HOST_ID) as DynamodbHost | undefined) ??
			new DynamodbHost(root, DYNAMODB_HOST_ID)
		);
	}
}

export class DynamodbTable<Fields extends BaseFields = BaseFields>
	extends Construct
	implements IDynamodbTable
{
	readonly connection: DynamodbConnection;

	constructor(scope: Construct, id: string, props: DynamodbTableProps<Fields>) {
		super(scope, id);

		const host = DynamodbHost.of(this);
		const service = new Service(this, "Service", {
			context: {
				endpoint: host.endpoint,
				props,
				tableName: `${this.node.path.replaceAll("/", "-")}-${this.node.addr.slice(0, 10)}`,
			},
			procedure: createDynamodbTableProcedure,
		});
		this.connection = {
			endpoint: host.endpoint,
			tableName: service.outputs.tableName,
		};
	}

	static endpoint(scope: Construct): string {
		return DynamodbHost.of(scope).endpoint;
	}
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace DynamodbTable {
	export type Connection = DynamodbConnection;
}
