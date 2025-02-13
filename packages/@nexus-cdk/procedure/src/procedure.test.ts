import { expect, test } from "bun:test";

import { createBuilder } from "./procedure.ts";

const anyProcedure = createBuilder();

test("allows creating simple procedures", () => {
	const { procedure } = anyProcedure(
		"procedure",
		"file://procedure.ts",
	).handler(async () => {});

	expect(procedure).toMatchObject({
		importFilename: "file://procedure.ts",
		importName: "procedure",
		invoke: expect.any(Function),
	});
});

test("procedures can be invoked", async () => {
	const { procedure } = anyProcedure(
		"procedure",
		"file://procedure.ts",
	).handler(() => {
		return "hello world";
	});

	expect(
		procedure.invoke({
			ctx: {},
			input: undefined,
		}),
	).resolves.toBe("hello world");
});

test("uses input schemas with valibot", async () => {
	const v = await import("valibot");

	const { procedure } = anyProcedure("procedure", "file://procedure.ts")
		.input(
			v.object({
				foo: v.string(),
			}),
		)
		.handler((opts) => {
			return opts.input.foo;
		});

	expect(
		procedure.invoke({
			ctx: {},
			input: { foo: "bar" },
		}),
	).resolves.toBe("bar");
});

test("uses output schemas with valibot", async () => {
	const v = await import("valibot");

	const { procedure } = anyProcedure("procedure", "file://procedure.ts")
		.output(
			v.object({
				foo: v.string(),
			}),
		)
		.handler((opts) => {
			return {
				foo: "bar",
			};
		});

	expect(
		procedure.invoke({
			ctx: {},
			input: undefined,
		}),
	).resolves.toMatchObject({
		foo: "bar",
	});
});

import type { Check as CheckJson } from "json-codec";

import type { Assume, HKT } from "./hkt.ts";

test("builder can be customized to restrict inputs and outputs", async () => {
	const v = await import("valibot");

	interface CheckJsonHKT extends HKT {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		apply: (value: Assume<this["_1"], any>) => CheckJson<typeof value>;
	}

	const jsonProcedure = createBuilder<CheckJsonHKT>();

	jsonProcedure("procedure", "file://procedure.ts").input(
		// @ts-expect-error - date is not serializable in JSON
		v.object({
			foo: v.date(),
		}),
	);

	jsonProcedure("procedure", "file://procedure.ts").output(
		// @ts-expect-error - date is not serializable in JSON
		v.object({
			foo: v.date(),
		}),
	);

	jsonProcedure("procedure", "file://procedure.ts")
		// @ts-expect-error - date is not serializable in JSON
		.handler(() => {
			return { date: new Date() };
		});

	jsonProcedure("procedure", "file://procedure.ts")
		// @ts-expect-error - date is not serializable in JSON
		.handler(() => {
			return new Date();
		});
});
