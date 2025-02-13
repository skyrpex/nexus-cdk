import { createApiClient } from "@nexus-sdk/client-api";
import type { Api } from "../src/infra.ts";

const form = document.querySelector("#form") as HTMLFormElement;
const input = document.querySelector("#input") as HTMLInputElement;
const messageList = document.querySelector("#list") as HTMLUListElement;

const client = createApiClient<Api>("/api");

async function updateMessageList() {
	const messages = await client.listMessages.query();
	messageList.innerHTML = messages
		.map(
			(message) =>
				`<li>[${message.messageId}] ${message.message} <button data-message-id="${message.messageId}">Delete</button></li>`,
		)
		.join("");
}

async function writeMessage() {
	const { value } = input;
	if (!value) return;
	input.value = "";
	input.focus();
	await client.writeMessage.mutation({
		message: value,
	});
	await updateMessageList();
}

form.addEventListener("submit", (event) => {
	event.preventDefault();
	writeMessage();
});

messageList.addEventListener("click", async (event) => {
	const target = event.target as HTMLElement;
	if (target.tagName === "BUTTON") {
		const messageId = target.dataset.messageId;
		if (messageId) {
			await client.deleteMessage.mutation({ messageId });
			await updateMessageList();
		}
	}
});

updateMessageList();
