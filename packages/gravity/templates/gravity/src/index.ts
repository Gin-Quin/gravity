import { createServer } from "http";
import { defineHandler } from "@digitak/gravity/node";
import { services } from "./services/index.js";
import schema from "./schema.json";

const PORT = 3000;

const { handler } = defineHandler({
	apiPath: "/api",
	services,
	schema,
});

const server = createServer(handler);

server.listen(PORT, () => {
	console.log(`✨ Gravity server listening to port ${PORT}`);
});
