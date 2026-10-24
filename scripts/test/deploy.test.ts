import { expect, test } from "bun:test";
import { isPublished, publishPackages, validatePackage } from "../jobs/deploy.ts";
import { orderPackages, type WorkspacePackage } from "../workspace.ts";
import { releaseManifest } from "../build.ts";

const version = "0.9.69";
const pkg = (name: string, dependencies: Record<string, string> = {}): WorkspacePackage => ({
	directory: `/packages/${name}/package`, manifest: { name, version, dependencies },
});

test("orders core and framework dependencies before adapters and rejects cycles", () => {
	expect(orderPackages([pkg("next", { react: version }), pkg("react", { gravity: version }), pkg("gravity")]).map(({ manifest }) => manifest.name)).toEqual(["gravity", "react", "next"]);
	expect(() => orderPackages([pkg("a", { b: version }), pkg("b", { a: version })])).toThrow("Circular");
});

test("rejects stale builds, private packages, and unresolved local dependencies", () => {
	const source = pkg("gravity").manifest;
	expect(() => validatePackage(source, source, version)).not.toThrow();
	expect(() => validatePackage({ ...source, version: "0.9.68" }, source, version)).toThrow("Rebuild");
	expect(() => validatePackage({ ...source, name: "wrong-package" }, source, version)).toThrow("Rebuild");
	expect(() => validatePackage({ ...source, private: true }, source, version)).toThrow("private");
	for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
		for (const range of ["link:../gravity/package", "workspace:*", "file:../gravity"]) {
			expect(() => validatePackage({ ...source, [field]: { dependency: range } }, source, version)).toThrow("unresolved local dependency");
		}
	}
});

test("release manifests resolve workspaces, map exports, and preserve types", () => {
	const manifest = releaseManifest({ ...pkg("react", { gravity: "workspace:*" }).manifest,
		main: "./source/index.ts", types: "./source/index.ts", bin: "./source/cli/gravity.ts",
		exports: { ".": { types: "./source/index.ts", default: "./source/index.ts" } },
		scripts: { build: "bun build" }, devDependencies: { testing: "*" },
	}, [pkg("gravity")]);
	expect(manifest.dependencies).toEqual({ gravity: version });
	expect(manifest.main).toBe("./index.js");
	expect(manifest.types).toBe("./index.d.ts");
	expect(manifest.bin).toBe("./cli/gravity.js");
	expect(manifest.exports).toEqual({ ".": { types: "./index.d.ts", default: "./index.js" } });
	expect(manifest.scripts).toBeUndefined();
	expect(manifest.devDependencies).toBeUndefined();
});

test("only an exact published version is skipped; registry errors fail", async () => {
	const request = (response: Response) => async () => response;
	expect(await isPublished("gravity", version, request(Response.json({ name: "gravity", version })))).toBe(true);
	expect(await isPublished("gravity", version, request(Response.json({ name: "gravity", version: "0.9.68" })))).toBe(false);
	expect(await isPublished("gravity", version, request(new Response(null, { status: 404 })))).toBe(false);
	await expect(isPublished("gravity", version, request(new Response(null, { status: 503 })))).rejects.toThrow("503");
});

test("resumes partial releases without republishing successful packages", async () => {
	const published = new Set(["gravity"]);
	const writes: string[] = [];
	await publishPackages([pkg("gravity"), pkg("react"), pkg("next")], version, {
		isPublished: async (name) => published.has(name),
		publish: (directory) => { const name = directory.split("/")[2]!; writes.push(name); published.add(name); },
	});
	expect(writes).toEqual(["react", "next"]);
});

test("preflight registry failures prevent every publish", async () => {
	let writes = 0;
	await expect(publishPackages([pkg("gravity"), pkg("react")], version, {
		isPublished: async (name) => { if (name === "react") throw new Error("Registry unavailable"); return false; },
		publish: () => { writes++; },
	})).rejects.toThrow("Registry unavailable");
	expect(writes).toBe(0);
});

test("publish failures stop subsequent packages", async () => {
	const writes: string[] = [];
	await expect(publishPackages([pkg("gravity"), pkg("react")], version, {
		isPublished: async () => false,
		publish: (directory) => { writes.push(directory); throw new Error("Authentication expired"); },
	})).rejects.toThrow("Authentication expired");
	expect(writes).toEqual([pkg("gravity").directory]);
});

test("reports a successful command without a visible published version as a failure", async () => {
	await expect(publishPackages([pkg("gravity")], version, {
		isPublished: async () => false, publish: () => {},
	})).rejects.toThrow("Could not verify");
});
