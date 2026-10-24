import { existsSync } from "fs";
import { resolve } from "path";
import { getPackages, root, runBun, type Manifest, type WorkspacePackage } from "../workspace.ts";

export const registry = "https://registry.npmjs.org";

export function validatePackage(manifest: Manifest, source: Manifest, version: string) {
	if (manifest.name !== source.name || manifest.version !== version) {
		throw new Error(`Rebuild ${source.name}: its built name/version does not match ${version}.`);
	}
	if (manifest.private) throw new Error(`${manifest.name} is marked private.`);
	for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const) {
		for (const [name, range] of Object.entries(manifest[field] ?? {})) {
			if (/^(link:|workspace:|file:)/.test(range)) throw new Error(`${manifest.name}: unresolved local dependency ${name}: ${range}`);
		}
	}
}

export async function isPublished(name: string, version: string, request: (url: string, options?: RequestInit) => Promise<Response> = fetch): Promise<boolean> {
	const response = await request(`${registry}/${name}/${version}`, { headers: { accept: "application/json" }, cache: "no-store" });
	if (response.status === 404) return false;
	if (!response.ok) throw new Error(`Registry check for ${name}@${version} failed: ${response.status}`);
	const manifest = await response.json() as Manifest;
	return manifest.name === name && manifest.version === version;
}

type ReleaseOperations = {
	isPublished: typeof isPublished;
	publish: (directory: string) => void;
};

export async function publishPackages(packages: WorkspacePackage[], version: string, operations: ReleaseOperations = {
	isPublished,
	publish: (directory) => { runBun(["publish", "--access", "public", `--registry=${registry}`], directory); },
}) {
	const pending: WorkspacePackage[] = [];
	// Finish every registry check before making the first write.
	for (const pkg of packages) {
		if (await operations.isPublished(pkg.manifest.name, version)) console.log(`Skipping ${pkg.manifest.name}@${version}: already published.`);
		else pending.push(pkg);
	}
	for (const { manifest, directory } of pending) {
		console.log(`\nPublishing ${manifest.name}@${version}...`);
		operations.publish(directory);
		if (!await operations.isPublished(manifest.name, version)) throw new Error(`Could not verify ${manifest.name}@${version} on the registry.`);
	}
}

export async function validateReleasePackage({ directory, manifest: source }: WorkspacePackage, version: string): Promise<WorkspacePackage> {
	const builtDirectory = resolve(directory, "package");
	const manifest: Manifest = await Bun.file(resolve(builtDirectory, "package.json")).json();
	validatePackage(manifest, source, version);
	const binaries = typeof manifest.bin === "string" ? [manifest.bin] : Object.values(manifest.bin ?? {});
	for (const file of [manifest.main, manifest.types, ...binaries].filter((file): file is string => !!file)) {
		if (!existsSync(resolve(builtDirectory, file))) throw new Error(`${manifest.name}: package is missing ${file}.`);
	}
	for (const binary of binaries) {
		if (!(await Bun.file(resolve(builtDirectory, binary)).text()).startsWith("#!/usr/bin/env bun\n")) {
			throw new Error(`${manifest.name}: executable ${binary} must use Bun.`);
		}
	}
	if (!binaries.length && !existsSync(resolve(builtDirectory, "index.js"))) throw new Error(`${manifest.name}: package is missing index.js.`);
	runBun(["pm", "pack", "--dry-run"], builtDirectory, true);
	console.log(`Validated ${manifest.name}@${version}.`);
	return { directory: builtDirectory, manifest };
}

export async function deploy(args: string[]) {
	const allowed = new Set(["--dry-run", "--bump", "--help"]);
	for (const arg of args) if (!allowed.has(arg)) throw new Error(`Unknown argument: ${arg}. Use bun run deploy --help.`);
	if (args.includes("--help")) {
		console.log(`Usage: bun run deploy [--dry-run | --bump]

  (no flags)  Check, build, validate, and publish the current version.
  --dry-run   Check and build all packages without publishing or bumping.
  --bump      Increment every workspace's patch version, then publish.

After a partial release, retry without --bump. Already published versions are
skipped. Use local registry credentials. Git commits and pushes are managed separately.`);
		return;
	}
	const dryRun = args.includes("--dry-run");
	if (dryRun && args.includes("--bump")) throw new Error("Use --dry-run with the current version; --bump changes release manifests.");
	const packages = await getPackages();
	const rootManifest: Manifest = await Bun.file(resolve(root, "package.json")).json();
	let version = rootManifest.version;
	for (const { manifest } of packages) if (manifest.version !== version) throw new Error(`${manifest.name} must have version ${version}.`);
	if (!dryRun) {
		try { runBun(["pm", "whoami"]); }
		catch { throw new Error("Registry authentication failed. Configure local npm credentials, then retry bun run deploy."); }
	}
	if (args.includes("--bump")) {
		if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Cannot patch-bump version ${version}.`);
		const parts = version.split(".").map(Number);
		parts[2]!++;
		version = parts.join(".");
		for (const { directory, manifest } of [{ directory: root, manifest: rootManifest }, ...packages]) {
			manifest.version = version;
			await Bun.write(resolve(directory, "package.json"), JSON.stringify(manifest, null, "\t") + "\n");
		}
		// Workspace versions are part of Bun's lockfile.
		runBun(["install", "--lockfile-only", "--ignore-scripts"]);
	}
	runBun(["run", "build"]);
	const builtPackages: WorkspacePackage[] = [];
	for (const pkg of packages) builtPackages.push(await validateReleasePackage(pkg, version));
	if (dryRun) {
		console.log(`\nDry run successful: all ${builtPackages.length} packages are ready for ${version}. Nothing was published.`);
		return;
	}
	await publishPackages(builtPackages, version);
	console.log(`\nRelease complete: all ${builtPackages.length} packages are available at ${version}.`);
}
