import {
	queryOptions,
	type UndefinedInitialDataOptions,
	useMutation,
	type UseMutationOptions,
} from "@tanstack/react-query";

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
	mutate: (input: T["input"]) => Promise<T["output"]>;
	mutationOptions: () => UseMutationOptions<T["output"], Error, T["input"]>;
}

interface ApiClientQuery<T extends { input: unknown; output: unknown }> {
	query: (input: T["input"]) => Promise<T["output"]>;
	queryOptions: (input: T["input"]) => UndefinedInitialDataOptions<T["output"]>;
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
				const propString = String(prop);
				const mutationFn = async (input: T[keyof T]["input"]) => {
					const response = await fetch(`${url}/${propString}`, {
						body: JSON.stringify(input),
						method: "POST",
					});
					return response.json() as T[keyof T]["output"];
				};
				const queryFn = async (input: T[keyof T]["input"]) => {
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
				};
				return {
					mutate: mutationFn,
					mutationOptions: () => {
						return useMutation({
							mutationFn,
						});
					},
					query: queryFn,
					queryOptions: (input: T[keyof T]["input"]) => {
						return queryOptions({
							queryFn,
							queryKey: [propString, input],
						});
					},
				};
			},
		},
	) as ApiClient<T>;
};
