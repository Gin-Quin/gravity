import { defineHandler } from "@digitak/gravity/bun";
import { services } from "./services/index.js";
import schema from "./schema.json";

const PORT = 3000;

const { handler } = defineHandler({
	apiPath: "/api",
	services,
	schema,
});

const server = Bun.serve({
	port: PORT,
	async fetch(request) {
		return await handler(request) ?? new Response("Not found", { status: 404 });
	},
});

console.log(`✨ Gravity server listening to port ${server.port}`);
