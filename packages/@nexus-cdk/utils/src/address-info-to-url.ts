import type { AddressInfo } from "node:net";

import assert from "node:assert";

export const addressInfoToURL = (
	address: AddressInfo | null | string,
	protocol: "http" | "ws",
): string => {
	assert(address);

	if (typeof address === "string") {
		return address;
	}

	return `${protocol}://localhost:${address.port}`;
};
