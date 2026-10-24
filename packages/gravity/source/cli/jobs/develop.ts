import fs from "fs-extra";
import print from "@digitak/print";
import type { GravityCliOptions } from "../GravityCliOptions.js";
import { generateSchema } from "./generateSchema.js";
import { resolveCliOptions } from "../utilities/resolveCliOptions.js";

export type GravityDevelopOptions = Pick<
	GravityCliOptions,
	"entryFile" | "servicesFile" | "schemaFile" | "use"
>;

export function develop(options?: GravityCliOptions) {
	const { entryFile, servicesFile, schemaFile, use, schemaless } =
		resolveCliOptions(options);

	if (!use) {
		if (!fs.existsSync(entryFile)) {
			print.error`\n  ❌ [white: Could not find entry file [bold:'${entryFile}']]\n`;
			return;
		}
	}

	if (schemaless) {
		const env = globalThis.process?.env ?? import.meta?.env;
		if (env) env.GRAVITY_SCHEMALESS = "true";
	} else {
		generateSchema({
			servicesFile,
			schemaFile,
			watch: true,
		});
	}

	const args = use ? ["exec", use] : ["--watch", entryFile];
	Bun.spawn([process.execPath, ...args], { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
}
