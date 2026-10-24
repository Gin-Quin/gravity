import { afterAll, expect, spyOn, test } from "bun:test";
import { defineHandler } from "../source/bun";
import { defineApi } from "../source/api/defineApi";
import { ServerError } from "../source";
import { services } from "./server/services";
import schema from "./server/schema.json";
import { isPrivate } from "./server/guards/Private";
import { logger } from "../source/logs/logger";

function withExpectedErrorLogs(run: () => Promise<void>) {
	return async () => {
		const isExpected = (name: string, message: string) =>
			(name === "GravityError" && message === "Bad parameters") ||
			(name === "ServerError" && message === "Forbidden access");
		const consoleSpies = (["warn", "error"] as const).map((method) => {
			const original = console[method].bind(console);
			return spyOn(console, method).mockImplementation((...args: unknown[]) => {
				const [error] = args;
				if (error instanceof Error && isExpected(error.name, error.message)) return;
				original(...args);
			});
		});
		const loggerSpies = (["warning", "error"] as const).map((method) => {
			const original = logger[method].bind(logger);
			return spyOn(logger, method).mockImplementation((name, message, stack) => {
				if (!isExpected(name, message)) original(name, message, stack);
			});
		});
		try {
			await run();
		} finally {
			for (const spy of [...consoleSpies, ...loggerSpies]) spy.mockRestore();
		}
	};
}

const { handler } = defineHandler({
	services, schema,
	onRequestReceive: () => ({ user: { isAdmin: false } }),
	authorize({ service, path: [property] }) {
		if (isPrivate(service, property)) throw new ServerError("Forbidden access");
	},
});
const server = Bun.serve({
	port: 0,
	async fetch(request) { return await handler(request) ?? new Response("Not found", { status: 404 }); },
});
const { api } = defineApi<typeof services>({ apiPath: `http://localhost:${server.port}/api` });
afterAll(() => server.stop(true));

test("RPC calls, input validation, guards, and tags work under Bun", withExpectedErrorLogs(async () => {
	const same = (actual: unknown, expected: unknown, message: string) => expect(actual, message).toEqual(expected);
	const truthy = (actual: unknown, message: string) => expect(actual, message).toBeTruthy();

	{
		same(await api.math.add(3, 4), { data: 7 }, `Fetch addition`);
		same(await api.foo.bar(), { data: "bar" }, `Fetch string`);
		same(await api.foo.void(), { data: undefined }, `Fetch undefined`);
		same(await api.foo.rawString(), { data: "rawString" }, `Fetch raw string`);
		same(await api.foo.rawArray(), { data: [1, 2, 3] }, `Fetch raw array`);
		same(await api.foo.rawArray[0](), { data: 1 }, `Fetch raw array element`);
		truthy((await api.foo.rawDate()).data instanceof Date, `Fetch raw date`);
		same(await api.foo.nested.value(), { data: 12 }, `Fetch nested value`);
	}

	{
		same(
			(await api.math.add(3, "4" as any)).error?.message,
			"Bad parameters",
			`String as number`,
		);
		same(
			(await (api.math.add as any)(3)).error?.message,
			"Bad parameters",
			`Not enough parameters`,
		);
		same(
			(await (api.math.add as any)(3, 4, 5)).error?.message,
			"Bad parameters",
			`Too much parameters`,
		);
	}

	{
		same(
			(await api.foo.onlyForAdmins()).error?.message,
			"Forbidden access",
			`Method-level guard`,
		);
		same(
			(await api.foo.primitiveForAdmins()).error?.message,
			"Forbidden access",
			`Primitive-level guard`,
		);
		same(
			(await api.foo.nestedForAdmins.value()).error?.message,
			"Forbidden access",
			`Nested guard`,
		);
		same(
			(await api.admin.onlyForAdmins()).error?.message,
			"Forbidden access",
			`Service-level guard`,
		);
		same(
			(await api.admin.rawString()).error?.message,
			"Forbidden access",
			`Primitive of service-level guard`,
		);
		same(
			(await api.admin.nested.value()).error?.message,
			"Forbidden access",
			`Service-level nested guard`,
		);
	}

	{
		same(
			(await api.foo.onlyForPrivate()).error?.message,
			"Forbidden access",
			`Method-level tag`,
		);
		same(
			(await api.foo.primitiveForPrivate()).error?.message,
			"Forbidden access",
			`Primitive-level tag`,
		);
		same(
			(await api.foo.nestedPrivate.value()).error?.message,
			"Forbidden access",
			`Nested tag`,
		);
		same(
			(await api.privateService.onlyForPrivate()).error?.message,
			"Forbidden access",
			`Service-level guard`,
		);
		same(
			(await api.privateService.rawString()).error?.message,
			"Forbidden access",
			`Primitive of service-level guard`,
		);
		same(
			(await api.privateService.nested.value()).error?.message,
			"Forbidden access",
			`Service-level nested tag`,
		);
	}

}));
