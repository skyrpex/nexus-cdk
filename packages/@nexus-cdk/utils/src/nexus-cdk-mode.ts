export type NexusCdkMode = "local" | "synth";

export const NEXUS_CDK_MODE: NexusCdkMode =
	process.env.NEXUS_CDK_MODE === "local" ? "local" : "synth";
