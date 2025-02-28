import assert from "node:assert";

import { Construct } from "constructs";
import { hash } from "ohash";

export interface Token {
	constructPath: string;
	id: string;
	outputKey: string;
	value: unknown;
}

export class TokensHost extends Construct {
	readonly tokens = new Map<string, Token>();

	private constructor(scope: Construct, id: string) {
		super(scope, id);
	}

	static of(scope: Construct): TokensHost {
		const id = "nexus-TokensHost-mnnjwG2E2p";
		const root = scope.node.root;
		return (root.node.tryFindChild(id) as TokensHost | undefined) ?? new TokensHost(root, id);
	}

	token(constructPath: string, outputKey: string): Token {
		const tokenHash = hash([constructPath, outputKey]);
		const id = `\${NEXUS_TOKEN[TOKEN_${tokenHash}]}`;
		const token: Token = {
			constructPath,
			id,
			outputKey,
			value: undefined,
		};
		this.tokens.set(id, token);
		return token;
	}
}

const NEXUS_TOKEN_REGEXP = /\$\{NEXUS_TOKEN\[TOKEN_.*?\]\}/g;

export const getTokensFromString = (value: string) => {
	const tokens = new Set<string>();
	const matches = value.matchAll(NEXUS_TOKEN_REGEXP);
	for (const match of matches) {
		const token = match[0];
		assert(token);
		tokens.add(token);
	}
	return tokens;
};
