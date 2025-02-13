import { App } from "aws-cdk-lib";
import * as cdk from "nexus-cdk";

import {
	deleteMessage,
	listMessages,
	writeMessage,
} from "./infra.procedures.ts";

////////////////////////////////////////////////////////////////////////////////
// App
////////////////////////////////////////////////////////////////////////////////
const app = new App();
export default app;

////////////////////////////////////////////////////////////////////////////////
// Api
////////////////////////////////////////////////////////////////////////////////
const table = new cdk.DynamodbTable(app, "Messages", {
	fields: {
		channel: "string",
		messageId: "string",
	},
	primaryIndex: {
		hashKey: "channel",
		rangeKey: "messageId",
	},
});

const api = cdk.Api.fromEndpoints(app, "Api", {
	endpoints: {
		deleteMessage: new cdk.Mutation(app, "DeleteMessage", {
			context: {
				table: table.connection,
			},
			procedure: deleteMessage,
		}),
		listMessages: new cdk.Query(app, "ListMessages", {
			context: {
				table: table.connection,
			},
			procedure: listMessages,
		}),
		writeMessage: new cdk.Mutation(app, "WriteMessage", {
			context: {
				table: table.connection,
			},
			procedure: writeMessage,
		}),
	},
	prefix: "api",
});

export type Api = cdk.InferApi<typeof api>;

////////////////////////////////////////////////////////////////////////////////
// Vite
////////////////////////////////////////////////////////////////////////////////
new cdk.Vite(app, "Vite", {
	proxy: {
		"/api": api.endpoint,
	},
	root: new URL("../www", import.meta.url).pathname,
});
