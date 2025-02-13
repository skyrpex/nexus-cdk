export const nodeExecutor =
	"deno" in process.versions ? "deno" : "bun" in process.versions ? "bun" : "node";
