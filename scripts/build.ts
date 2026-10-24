import { copyFileSync, mkdirSync, rmSync, chmodSync, writeFileSync } from "fs";
import { dirname, relative, resolve } from "path";
import ts from "typescript";
import { generate } from "../packages/gravity/scripts/jobs/generate.ts";
import { getPackages, root, runBun, type Manifest, type WorkspacePackage } from "./workspace.ts";

export function releaseManifest(source: Manifest, packages: WorkspacePackage[]): Manifest {
	const manifest: Manifest = structuredClone(source);
	delete manifest.scripts;
	delete manifest.devDependencies;
	const versions = new Map(packages.map(({ manifest }) => [manifest.name, manifest.version]));
	for (const field of ["dependencies", "peerDependencies", "optionalDependencies"] as const) {
		for (const [name, range] of Object.entries(manifest[field] ?? {})) {
			if (range.startsWith("workspace:")) {
				const version = versions.get(name);
				if (!version) throw new Error(`Unknown workspace dependency: ${name}`);
				manifest[field]![name] = version;
			}
		}
	}
	const outputPath = (file: string, types = false) => file.replace(/^\.\/source\//, "./").replace(/\.tsx?$/, types ? ".d.ts" : ".js");
	if (manifest.main) manifest.main = outputPath(manifest.main);
	if (manifest.types) manifest.types = outputPath(manifest.types, true);
	if (typeof manifest.bin === "string") manifest.bin = outputPath(manifest.bin);
	else if (manifest.bin) manifest.bin = Object.fromEntries(Object.entries(manifest.bin).map(([name, file]) => [name, outputPath(file)]));
	if (manifest.exports) {
		manifest.exports = Object.fromEntries(Object.entries(manifest.exports).map(([name, value]) => [name,
			typeof value === "string" ? outputPath(value) : Object.fromEntries(Object.entries(value).map(([condition, file]) => [condition, outputPath(file, condition === "types")]))
		]));
	}
	return manifest;
}

async function buildPackage(pkg: WorkspacePackage, packages: WorkspacePackage[]) {
	const { directory, manifest } = pkg;
	const source = resolve(directory, "source");
	const output = resolve(directory, "package");
	console.log(`\nBuilding ${manifest.name}...`);
	if (manifest.name === "@digitak/gravity") {
		const previous = process.cwd();
		try { process.chdir(directory); await generate({ silent: true }); }
		finally { process.chdir(previous); }
	}
	rmSync(output, { recursive: true, force: true });
	mkdirSync(output, { recursive: true });
	const files = Array.from(new Bun.Glob("**/*.{ts,tsx}").scanSync({ cwd: source })).filter((file) => !file.endsWith(".d.ts"));
	// Preserve the public subpath modules rather than duplicating shared state.
	runBun(["build", ...files.map((file) => resolve(source, file)), "--no-bundle", "--target=bun", "--format=esm", `--root=${source}`, `--outdir=${output}`], directory, true);

	// Bun checks types and builds JavaScript; TypeScript only emits declarations.
	const config = ts.readConfigFile(resolve(directory, "tsconfig.json"), ts.sys.readFile);
	const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, directory);
	const program = ts.createProgram(files.map((file) => resolve(source, file)), {
		...parsed.options, rootDir: root, outDir: output, noEmit: false,
		declaration: true, emitDeclarationOnly: true, declarationMap: false,
	});
	for (const file of files) {
		const sourceFile = program.getSourceFile(resolve(source, file));
		if (!sourceFile) throw new Error(`Missing declaration source: ${file}`);
		const result = program.emit(sourceFile, (_name, text) => {
			const destination = resolve(output, file.replace(/\.tsx?$/, ".d.ts"));
			mkdirSync(dirname(destination), { recursive: true });
			writeFileSync(destination, text);
		}, undefined, true);
		if (result.emitSkipped || result.diagnostics.length) {
			throw new Error(ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
				getCanonicalFileName: (file) => file, getCurrentDirectory: () => directory, getNewLine: () => "\n",
			}) || `Could not emit declarations for ${file}`);
		}
	}
	copyFileSync(resolve(directory, "README.md"), resolve(output, "README.md"));
	const built = releaseManifest(manifest, packages);
	await Bun.write(resolve(output, "package.json"), JSON.stringify(built, null, "\t") + "\n");
	const binaries = typeof built.bin === "string" ? [built.bin] : Object.values(built.bin ?? {});
	for (const binary of binaries) {
		const file = resolve(output, binary);
		const content = await Bun.file(file).text();
		if (!content.startsWith("#!")) await Bun.write(file, `#!/usr/bin/env bun\n${content}`);
		chmodSync(file, 0o755);
	}
	console.log(`Built ${relative(root, directory)} (${files.length} modules + declarations).`);
}

if (import.meta.main) {
	// Also enforce the check when a package invokes this script directly.
	runBun(["check"]);
	const packages = await getPackages();
	const selected = process.argv[2];
	if (selected && !packages.some(({ directory }) => directory.endsWith(`/${selected}`))) throw new Error(`Unknown package: ${selected}`);
	for (const pkg of packages) {
		if (!selected || pkg.directory.endsWith(`/${selected}`)) await buildPackage(pkg, packages);
	}
}
