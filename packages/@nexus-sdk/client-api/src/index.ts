type ApiClient<
	T extends Record<
		string,
		{ input: unknown; output: unknown; type: EndpointType }
	>,
> = {
	[K in keyof T]: T[K] extends { type: "query" }
		? ApiClientQuery<T[K]>
		: T[K] extends { type: "mutation" }
			? ApiClientMutation<T[K]>
			: never;
};

interface ApiClientMutation<T extends { input: unknown; output: unknown }> {
	mutation: (input: T["input"]) => Promise<T["output"]>;
}

interface ApiClientQuery<T extends { input: unknown; output: unknown }> {
	query: (input: T["input"]) => Promise<T["output"]>;
}

type EndpointType = "mutation" | "query";

export const createApiClient = <
	T extends Record<
		string,
		{ input: unknown; output: unknown; type: EndpointType }
	>,
>(
	url: string,
): ApiClient<T> => {
	return new Proxy(
		{},
		{
			get(target, prop) {
				return {
					mutation: async (input: T[keyof T]["input"]) => {
						const response = await fetch(`${url}/${String(prop)}`, {
							body: JSON.stringify(input),
							method: "POST",
						});
						return response.json() as T[keyof T]["output"];
					},
					query: async (input: T[keyof T]["input"]) => {
						const queryParams = new URLSearchParams();
						for (const key in input) {
							queryParams.set(key, String(input[key]));
						}
						const response = await fetch(
							`${url}/${String(prop)}?${queryParams.toString()}`,
							{
								method: "GET",
							},
						);
						return response.json() as T[keyof T]["output"];
					},
				};
			},
		},
	) as ApiClient<T>;
};
