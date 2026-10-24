import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";

const cli = resolve(import.meta.dir, "../source/cli/gravity.ts");
const fixtures: string[] = [];
function fixture(source: string): string {
	const directory = mkdtempSync(resolve(tmpdir(), "gravity-cli-"));
	fixtures.push(directory);
	mkdirSync(resolve(directory, "src"));
	writeFileSync(resolve(directory, "package.json"), JSON.stringify({ name: "build-fixture", type: "module" }));
	writeFileSync(resolve(directory, "tsconfig.json"), JSON.stringify({ compilerOptions: {
		target: "ES2022", module: "Preserve", moduleResolution: "Bundler", strict: true, noEmit: true, types: [],
	}, include: ["src/**/*.ts"] }));
	writeFileSync(resolve(directory, "src/index.ts"), source);
	return directory;
}

afterEach(() => fixtures.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true })));

test("CLI checks and builds TypeScript with Bun", async () => {
	const cwd = fixture('export const greeting: string = "hello from Bun";');
	const result = Bun.spawnSync([process.execPath, cli, "build", "--schemaless", "--output", "dist/server.js"], { cwd });
	expect(result.exitCode).toBe(0);
	expect(existsSync(resolve(cwd, "dist/server.js"))).toBe(true);
	const output = await import(resolve(cwd, "dist/server.js"));
	expect(output.greeting).toBe("hello from Bun");
});

test("type errors stop the CLI before it creates build output", () => {
	const cwd = fixture("export const greeting: string = 123;");
	const result = Bun.spawnSync([process.execPath, cli, "build", "--schemaless", "--output", "dist/server.js"], { cwd });
	expect(result.exitCode).not.toBe(0);
	expect(result.stdout.toString() + result.stderr.toString()).toContain("Type checking failed");
	expect(existsSync(resolve(cwd, "dist/server.js"))).toBe(false);
});
