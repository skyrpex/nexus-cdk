const exponentialBackoffTimeout = (attempt: number) => 100 + attempt * 1000;

export interface ExponentialBackoffOptions {
	readonly maxAttempts?: number;
}

export const exponentialBackoff = async <T>(
	handler: () => Promise<T> | T,
	options?: ExponentialBackoffOptions,
): Promise<T> => {
	const maxAttempts = options?.maxAttempts ?? 4;

	let attempt = 0;
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	while (true) {
		try {
			return await handler();
		} catch (error) {
			attempt += 1;
			if (attempt >= maxAttempts) {
				throw error;
			}
			await new Promise((resolve) =>
				setTimeout(resolve, exponentialBackoffTimeout(attempt)),
			);
		}
	}
};
