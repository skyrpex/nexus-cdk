import assert from "node:assert";

import { DynamoDB } from "@aws-sdk/client-dynamodb";
import * as cdk from "nexus-cdk";
import { z } from "zod";

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
			Item: {
				channel: { S: "default" },
				message: { S: input.message },
				messageId: { S: crypto.randomUUID() },
			},
			TableName: ctx.table.tableName,
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
			ExpressionAttributeValues: {
				":channel": { S: "default" },
			},
			KeyConditionExpression: "channel = :channel",
			TableName: ctx.table.tableName,
		});
		assert(result.Items);
		return result.Items.map((item) => {
			assert(item.message?.S);
			assert(item.messageId?.S);
			return {
				message: item.message.S,
				messageId: item.messageId.S,
			};
		});
	});

export const { getMessage } = cdk
	.procedure("getMessage", import.meta.url)
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
		const result = await dynamodb.getItem({
			Key: {
				channel: { S: "default" },
				messageId: { S: input.messageId },
			},
			TableName: ctx.table.tableName,
		});
		assert(result.Item);
		assert(result.Item.message?.S);
		assert(result.Item.messageId?.S);
		return {
			message: result.Item.message.S,
			messageId: result.Item.messageId.S,
		};
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
			Key: {
				channel: { S: "default" },
				messageId: { S: input.messageId },
			},
			TableName: ctx.table.tableName,
		});
		return {
			ok: true,
		};
	});
