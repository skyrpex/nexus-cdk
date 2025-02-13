export type Apply<F extends HKT, _1> = ReturnType<
	(F & {
		readonly _1: _1;
	})["apply"]
>;

export type Assume<T, U> = T extends U ? T : U;

export interface HKT {
	readonly _1?: unknown;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly apply: (...args: any[]) => any;
}
