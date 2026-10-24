import type { GravityCliOptions } from "../GravityCliOptions.js";
import { findConfiguration } from "./findConfiguration.js";
import { findPackageInfos } from "./findPackageInfos.js";
import { merge } from "./merge.js";

export function resolveCliOptions(
	cliOptions?: GravityCliOptions,
): Required<GravityCliOptions> {
	const packageInfos = findPackageInfos();
	const configuration = findConfiguration();

	const defaultOptions: Required<GravityCliOptions> = {
		entryFile: "src/index.ts",
		outputFile: "dist/index.js",
		servicesFile: "src/services/index.ts",
		schemaFile: "src/schema.json",
		watch: false,
		verbose: true,
		bunBuildOptions: {},
		use: "",
		bundleDependencies: false,
		schemaless: false,
	};

	return merge(
		defaultOptions,
		packageInfos?.gravity,
		configuration,
		cliOptions,
	);
}
