import { parse, type Stringified, stringify } from "devalue-codec";

export interface Connection {
	endpoint: string;
	tableName: string;
}

export type ConnectionString = Stringified<Connection>;

export const stringifyConnectionString = (
	options: Connection,
): ConnectionString => {
	return stringify(options);
};

export const parseConnectionString = (
	connectionString: ConnectionString,
): Connection => {
	return parse(connectionString);
};
