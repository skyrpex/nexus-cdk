import type { Connection } from "@nexus-sdk/lib-dynamodb";

export type BaseFields = Record<string, "number" | "string">;

export interface DynamodbTableProps<Fields extends BaseFields = BaseFields> {
	fields: Fields;
	primaryIndex: {
		hashKey: StringOnly<keyof Fields>;
		rangeKey?: StringOnly<keyof Fields>;
	};
	stream?: "KEYS_ONLY" | "NEW_AND_OLD_IMAGES" | "NEW_IMAGE" | "OLD_IMAGE";
	timeToLiveField?: string;
}

export interface IDynamodbTable {
	readonly connection: Connection;
}

type StringOnly<T> = T extends string ? T : never;
