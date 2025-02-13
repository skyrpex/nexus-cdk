// import "tsx";

// // @ts-ignore
// await import("../src/bin.ts");

const EXECUTOR = "deno" in process.versions ? "deno" : "bun" in process.versions ? "bun" : "node";

if (EXECUTOR === "node") {
	const { tsImport } = await import("tsx/esm/api");
	await tsImport("../src/bin.ts", import.meta.url);
} else {
	await import("../src/bin.ts");
}
