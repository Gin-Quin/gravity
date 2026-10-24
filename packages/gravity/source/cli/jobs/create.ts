import { searchDependencies } from "../utilities/searchDependencies.js";
import { select } from "../utilities/select.js";
import { ask } from "../utilities/ask.js";
import type { CompatibleFramework } from "../utilities/compatibleFrameworks.js";
import { compatibleFrameworks } from "../utilities/compatibleFrameworks.js";
import { copyTemplates } from "../utilities/copyTemplates.js";
import fs from "fs-extra";
import chalk from "chalk";
import { join } from "path";
import { findPackageScripts } from "../utilities/findPackageScripts.js";
import { updatePackageInfos } from "../utilities/updatePackageInfos.js";

export type GravityCreateOptions = {
	destination?: string;
	manual?: boolean;
};

export async function create(
	options: GravityCreateOptions = {},
): Promise<void> {
	const manual = options?.manual ?? false;
	const destination = options?.destination || ".";

	const stage = (stageName: string) =>
		console.log(
			`\n${chalk.yellow.bold("→")} ${chalk.italic(stageName + "...")}`,
		);
	const done = (message: string) =>
		console.log(`${chalk.green.bold("→")} ${chalk.bold(message)}`);

	/**
	 * 1. Ensure destination directory exists
	 */
	if (destination) {
		fs.ensureDirSync(destination);
	}

	/**
	 * 3. Ensure package.json exists
	 */
	if (!fs.existsSync(join(destination, "package.json"))) {
		stage("Creating package.json");
		const initialized = Bun.spawnSync([process.execPath, "init", "--yes"], { cwd: destination });
		if (initialized.exitCode !== 0) throw new Error(`Project initialization failed: ${initialized.stderr.toString()}`);
		done("package.json created");
	}

	/**
	 * 4. Read package.json and detect dependencies
	 */
	const frameworks = new Set<CompatibleFramework>();

	if (manual) {
		const selected = await select(
			"Which framework do you want to use along Gravity?",
			compatibleFrameworks,
		);
		if (selected === undefined) return;
		if (selected !== "gravity") {
			frameworks.add(selected);
			done(`Using Gravity with ${compatibleFrameworks[selected]}`);
		} else {
			done("Using Gravity without any framework");
		}
	} else {
		stage("Detecting frameworks");
		const guessedFrameworks = searchDependencies({
			svelte: ["svelte"],
			"svelte-kit": ["@sveltejs/kit"],

			solid: ["solid-js"],

			react: ["react", "react-dom"],
			next: ["next"],

			vue: ["vue"],
			nuxt: ["nuxt"],
		});

		if (guessedFrameworks.size) {
			if (guessedFrameworks.has("svelte-kit")) {
				guessedFrameworks.delete("svelte");
			}
			if (guessedFrameworks.has("next")) {
				guessedFrameworks.delete("react");
			}
			if (guessedFrameworks.has("nuxt")) {
				guessedFrameworks.delete("vue");
			}

			guessedFrameworks.forEach((framework) =>
				done(`Detected ${compatibleFrameworks[framework]}`),
			);
			const ok = await ask(
				`Do you want to install Gravity with ${[...guessedFrameworks]
					.map((framework) => chalk.bold(compatibleFrameworks[framework]))
					.join(" and ")}?`,
			);
			if (ok === undefined) return;
			if (!ok) return create({ ...options, manual: true });
			guessedFrameworks.forEach((framework) => {
				frameworks.add(framework);
				done(`Using ${compatibleFrameworks[framework]}`);
			});
		} else {
			frameworks.add("gravity");
			done("No front-end framework detected");
		}
	}

	/**
	 * 5. Install packages
	 */
	stage("Installing packages (it can take some time)");

	const packagesToInstall = ["@digitak/gravity", ...[...frameworks].filter((framework) => framework !== "gravity").map((framework) => `@digitak/gravity-${framework}`)];

	packagesToInstall.forEach((packageName) =>
		stage(`Installing ${chalk.underline(packageName)}`),
	);

	const installed = Bun.spawnSync([process.execPath, "add", ...packagesToInstall], { cwd: destination });
	if (installed.exitCode !== 0) throw new Error(`Dependency installation failed: ${installed.stderr.toString()}`);

	packagesToInstall.forEach((packageName) =>
		done(`${chalk.underline(packageName)} installed`),
	);

	/**
	 * 6. Copy templates into the source directory
	 */
	stage("Copying necessary files");
	const templates = <string[]>[];
	const backEndFrameworks = ["gravity", "svelte-kit", "next", "nuxt"];
	const isServerSide = [...frameworks].some((framework) =>
		backEndFrameworks.includes(framework),
	);

	if (isServerSide) templates.push(`server`);
	frameworks.forEach((framework) => templates.push(framework));

	await copyTemplates(templates, destination);

	done("Files copied");

	/**
	 * 7. Add schema.json to .gitignore
	 */
	const ignoreSchema = "\nschema.json\n";
	const gitIgnoreFile = join(destination, ".gitignore");
	fs.ensureFileSync(gitIgnoreFile);
	if (!fs.readFileSync(gitIgnoreFile, "utf-8").includes(ignoreSchema)) {
		stage("Adding schema.json to .gitignore");
		fs.appendFileSync(gitIgnoreFile, ignoreSchema);
		done("schema.json added to .gitignore");
	}

	/**
	 * 8. Patching package scripts
	 */
	if (isServerSide) {
		stage("Patching package scripts");
		const scripts = findPackageScripts();
		scripts.dev =
			scripts.dev && !scripts.dev.startsWith("gravity ")
				? `gravity dev --use '${scripts.dev.replace(/'/g, "\\'")}'`
				: `gravity dev`;
		scripts.build =
			scripts.build && !scripts.build.startsWith("gravity ")
				? `gravity build --use '${scripts.build.replace(/'/g, "\\'")}'`
				: `gravity build`;
		if (frameworks.has("gravity")) {
			scripts.preview ||= `gravity preview`;
		}
		scripts["generate:schema"] ||= `gravity generate schema`;

		updatePackageInfos({ scripts });
		done("package scripts patched");
	}

	console.log("\n✨ Gravity is ready to use\n");
}
