import { createApiClient } from "@nexus-sdk/client-api";

import type { Api } from "../src/infra.ts";

const form = document.querySelector("#form") as HTMLFormElement;
const input = document.querySelector("#input") as HTMLInputElement;
const messageList = document.querySelector("#list") as HTMLUListElement;

const client = createApiClient<Api>("/api");

const updateMessageList = async () => {
	const messages = await client.listMessages.query();
	messageList.innerHTML = messages
		.map(
			(message) =>
				`<li>[${message.messageId}] ${message.message} <button data-message-id="${message.messageId}">Delete</button></li>`,
		)
		.join("");
};

const writeMessage = async () => {
	const { value } = input;
	if (!value) return;
	input.value = "";
	input.focus();
	await client.writeMessage.mutate({
		message: value,
	});
	await updateMessageList();
};

form.addEventListener("submit", (event) => {
	event.preventDefault();
	void writeMessage();
});

messageList.addEventListener("click", (event) => {
	const target = event.target as HTMLElement;
	if (target.tagName === "BUTTON") {
		const messageId = target.dataset.messageId;
		if (messageId) {
			void client.deleteMessage.mutate({ messageId }).then(async () => {
				await updateMessageList();
			});
		}
	}
});

void updateMessageList();
