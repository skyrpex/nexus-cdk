import type {
	AttributeDefinition,
	KeySchemaElement,
} from "@aws-sdk/client-dynamodb";

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

import { procedure } from "@nexus-cdk/procedure";
import { exponentialBackoff, getDockerUrlForPort } from "@nexus-cdk/utils";

import type { DynamodbTableProps } from "./dynamodb.types.ts";

const DYNAMODB_IMAGE = "amazon/dynamodb-local";
const DYNAMODB_PORT = 8000;

export const { dynamodbHostProcedure } = procedure(
	"dynamodbHostProcedure",
	import.meta.url,
).handler(async () => {
	const name = `nexus--dynamodb-${randomUUID()}`;

	const dynamodb = spawn(
		"docker",
		["run", "--rm", "-P", "--name", name, DYNAMODB_IMAGE],
		{
			stdio: ["ignore", "inherit", "inherit"],
		},
	);

	const endpoint = await exponentialBackoff(() => {
		return getDockerUrlForPort(name, DYNAMODB_PORT);
	});

	// The purpose of this is to check if the dynamodb container is ready.
	await exponentialBackoff(async () => {
		const { DynamoDBClient, ListTablesCommand } = await import(
			"@aws-sdk/client-dynamodb"
		);

		const client = new DynamoDBClient({
			endpoint,
		});

		await client.send(new ListTablesCommand({}));
	});

	console.log("DynamoDB container ready at", endpoint);

	return {
		endpoint,
	};
});

export const { createDynamodbTableProcedure } = procedure(
	"createDynamodbTableProcedure",
	import.meta.url,
)
	.context<{
		endpoint: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		props: DynamodbTableProps<any>;
		tableName: string;
	}>()
	.handler(async (opts) => {
		const { tableName } = opts.ctx;

		const { DynamoDB } = await import("@aws-sdk/client-dynamodb");

		const client = new DynamoDB({
			endpoint: opts.ctx.endpoint,
		});
		const keySchema: KeySchemaElement[] = [
			{
				AttributeName: opts.ctx.props.primaryIndex.hashKey,
				KeyType: "HASH",
			},
		];
		if (opts.ctx.props.primaryIndex.rangeKey) {
			keySchema.push({
				AttributeName: opts.ctx.props.primaryIndex.rangeKey,
				KeyType: "RANGE",
			});
		}
		// console.log("keySchema", keySchema);

		const attributeDefinitions: AttributeDefinition[] = Object.entries(
			opts.ctx.props.fields,
		).map(([name, type]) => ({
			AttributeName: name,
			AttributeType: type === "string" ? "S" : "N",
		}));

		// console.log("attributeDefinitions", attributeDefinitions);

		await client.createTable({
			AttributeDefinitions: attributeDefinitions,
			BillingMode: "PAY_PER_REQUEST",
			KeySchema: keySchema,
			StreamSpecification: opts.ctx.props.stream
				? {
						StreamEnabled: true,
						StreamViewType: opts.ctx.props.stream,
					}
				: undefined,
			TableName: tableName,
		});

		await exponentialBackoff(async () => {
			await client.describeTable({
				TableName: tableName,
			});
		});

		if (opts.ctx.props.timeToLiveField) {
			await client.updateTimeToLive({
				TableName: tableName,
				TimeToLiveSpecification: {
					AttributeName: opts.ctx.props.timeToLiveField,
					Enabled: true,
				},
			});
		}

		console.log("Dynamodb table ready", { tableName });

		return {
			tableName,
		};
	});
