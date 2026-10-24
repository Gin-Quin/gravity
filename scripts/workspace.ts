import { resolve } from "path";

export const root = resolve(import.meta.dir, "..");

export type Manifest = {
	name: string;
	version: string;
	private?: boolean;
	main?: string;
	types?: string;
	bin?: string | Record<string, string>;
	exports?: Record<string, string | Record<string, string>>;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	workspaces?: string[];
};

export type WorkspacePackage = { directory: string; manifest: Manifest };

export function runBun(args: string[], cwd = root, capture = false): string {
	const result = Bun.spawnSync([process.execPath, ...args], {
		cwd,
		stdin: capture ? "ignore" : "inherit",
		stdout: capture ? "pipe" : "inherit",
		stderr: capture ? "pipe" : "inherit",
	});
	if (result.exitCode !== 0) {
		throw new Error(`bun ${args.join(" ")} failed. ${capture ? result.stderr?.toString() ?? "" : ""}`.trim());
	}
	return capture ? result.stdout?.toString() ?? "" : "";
}

export function orderPackages(packages: WorkspacePackage[]): WorkspacePackage[] {
	const ordered: WorkspacePackage[] = [];
	const visiting = new Set<string>();
	const visited = new Set<string>();
	const byName = new Map(packages.map((pkg) => [pkg.manifest.name, pkg]));
	function visit(pkg: WorkspacePackage) {
		const name = pkg.manifest.name;
		if (visited.has(name)) return;
		if (visiting.has(name)) throw new Error(`Circular package dependency: ${name}`);
		visiting.add(name);
		const dependencies = { ...pkg.manifest.dependencies, ...pkg.manifest.peerDependencies, ...pkg.manifest.optionalDependencies };
		for (const dependency of Object.keys(dependencies)) {
			const workspace = byName.get(dependency);
			if (workspace) visit(workspace);
		}
		visiting.delete(name);
		visited.add(name);
		ordered.push(pkg);
	}
	packages.forEach(visit);
	return ordered;
}

export async function getPackages(): Promise<WorkspacePackage[]> {
	const manifest: Manifest = await Bun.file(resolve(root, "package.json")).json();
	const packages: WorkspacePackage[] = [];
	for (const pattern of manifest.workspaces ?? []) {
		for (const file of new Bun.Glob(`${pattern}/package.json`).scanSync({ cwd: root })) {
			packages.push({ directory: resolve(root, file, ".."), manifest: await Bun.file(resolve(root, file)).json() });
		}
	}
	return orderPackages(packages.filter(({ manifest }) => !manifest.private));
}
