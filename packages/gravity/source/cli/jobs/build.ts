import fs from "fs-extra";
import print from "@digitak/print";
import { dirname, basename } from "path";
import type { GravityCliOptions } from "../GravityCliOptions.js";
import { generateSchema } from "./generateSchema.js";
import { resolveCliOptions } from "../utilities/resolveCliOptions.js";

export type GravityBuildOptions = Pick<GravityCliOptions,
	"entryFile" | "schemaFile" | "servicesFile" | "outputFile" | "bunBuildOptions" |
	"bundleDependencies" | "use" | "schemaless" | "verbose"
>;

export async function build(options: GravityBuildOptions = {}) {
	const { entryFile, servicesFile, schemaFile, outputFile, bunBuildOptions, use, verbose, schemaless } = resolveCliOptions(options);
	if (!use && !fs.existsSync(entryFile)) throw new Error(`Could not find entry file '${entryFile}'.`);
	const check = Bun.spawnSync([process.execPath, "check"], { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
	if (check.exitCode !== 0) throw new Error("Type checking failed; build cancelled.");
	if (schemaless) process.env.GRAVITY_SCHEMALESS = "true";
	else generateSchema({ servicesFile, schemaFile, verbose });
	if (use) {
		await Bun.$`${{ raw: use }}`;
		return;
	}
	const result = await Bun.build({
		entrypoints: [entryFile],
		outdir: dirname(outputFile),
		naming: basename(outputFile),
		target: "bun",
		format: "esm",
		minify: true,
		packages: options.bundleDependencies ? "bundle" : "external",
		...bunBuildOptions,
	});
	if (!result.success) throw new AggregateError(result.logs, "Gravity build failed.");
	if (verbose) print`[bold.green:✔️] [underline:Build done]`;
}
