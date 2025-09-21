import { WebSocket } from "ws";

export const waitForOpen = async (ws: WebSocket) => {
	await new Promise<void>((resolve, reject) => {
		if (ws.readyState === WebSocket.OPEN) {
			resolve();
		} else {
			ws.on("open", () => {
				resolve();
			});
			ws.on("error", reject);
		}
	});
};
