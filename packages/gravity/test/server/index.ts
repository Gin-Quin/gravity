import { defineHandler } from "../../source/node";
import { services } from "./services";
import { createServer } from "http";
import { print } from "@digitak/print";
import schema from "./schema.json";
import { isPrivate } from "./guards/Private";
import { ServerError } from "../../source";
import { setCookies } from '../../source/cookie';

const PORT = 4000;

const { handler } = defineHandler({
	services,
	schema,
	allowedOrigins: ["http://localhost:3000"],
	onRequestReceive({ request, cookies }) {
		console.log("Received request", request.method, request.url);
		console.log('Received cookies:', cookies);
		return {
			user: {
				isAdmin: false,
			},
		};
	},
	async authorize({ service, path: [property], context }) {
		if (isPrivate(service, property)) {
			throw new ServerError(`Forbidden access`);
		}
	},
	onResponseSend({ response }) {
		setCookies(response, {
			user: 'admin',
			randomCookie: {
				value: "I'm a random cookie",
				maxAge: 1000 * 60 * 60 * 24 * 365,
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: true
			}
		});
		return response;
	},
});

const server = createServer(handler);
server.listen(PORT);

print(`\n✨ [bold.magenta:Gravity server is running on port ${PORT}] ✨`);
