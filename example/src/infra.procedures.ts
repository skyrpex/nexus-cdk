import * as cdk from "nexus-cdk";
import { z } from "zod";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import assert from "node:assert";

export const { writeMessage } = cdk
	.procedure("writeMessage", import.meta.url)
	.context<{ table: cdk.DynamodbTable.Connection }>()
	.input(
		z.object({
			message: z.string(),
		}),
	)
	.handler(async ({ ctx, input }) => {
		const dynamodb = new DynamoDB({
			endpoint: ctx.table.endpoint,
		});
		await dynamodb.putItem({
			TableName: ctx.table.tableName,
			Item: {
				channel: { S: "default" },
				messageId: { S: crypto.randomUUID() },
				message: { S: input.message },
			},
		});
		return {
			ok: true,
		};
	});

export const { listMessages } = cdk
	.procedure("listMessages", import.meta.url)
	.context<{ table: cdk.DynamodbTable.Connection }>()
	.handler(async ({ ctx }) => {
		const dynamodb = new DynamoDB({
			endpoint: ctx.table.endpoint,
		});
		const result = await dynamodb.query({
			TableName: ctx.table.tableName,
			KeyConditionExpression: "channel = :channel",
			ExpressionAttributeValues: {
				":channel": { S: "default" },
			},
		});
		assert(result.Items);
		return result.Items.map((item) => {
			assert(item.message?.S);
			assert(item.messageId?.S);
			return {
				messageId: item.messageId.S,
				message: item.message.S,
			};
		});
	});

export const { deleteMessage } = cdk
	.procedure("deleteMessage", import.meta.url)
	.context<{ table: cdk.DynamodbTable.Connection }>()
	.input(
		z.object({
			messageId: z.string(),
		}),
	)
	.handler(async ({ ctx, input }) => {
		const dynamodb = new DynamoDB({
			endpoint: ctx.table.endpoint,
		});
		await dynamodb.deleteItem({
			TableName: ctx.table.tableName,
			Key: {
				channel: { S: "default" },
				messageId: { S: input.messageId },
			},
		});
		return {
			ok: true,
		};
	});
