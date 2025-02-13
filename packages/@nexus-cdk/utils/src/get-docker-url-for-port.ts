import { spawnSync } from "node:child_process";

export const getDockerUrlForPort = (
	name: string,
	internalPort: number,
): string => {
	const { stdout } = spawnSync("docker", [
		"port",
		name,
		internalPort.toString(),
	]);
	const output = new TextDecoder().decode(stdout).trim();

	const match = /^(.+)(?:\n|$)/.exec(output);
	if (!match) {
		throw new Error(
			`Failed to get docker url for ${name} on port ${internalPort}`,
		);
	}
	return `http://${match[1]}`;
};
