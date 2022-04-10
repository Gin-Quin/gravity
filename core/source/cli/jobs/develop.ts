import esrun from "@digitak/esrun";
import { join } from "path";
import fs from "fs-extra";
import print from "@digitak/print";
import type { GravityCliOptions } from "../GravityCliOptions.js";
import { generateSchema } from "./generateSchema.js";

export type GravityDevelopOptions = Pick<
	GravityCliOptions,
	"entryFile" | "serverSourceDirectory" | "servicesFile"
>;

export function develop({
	entryFile = "index.ts",
	servicesFile = "services/index.ts",
	serverSourceDirectory = "./src",
}: GravityCliOptions = {}) {
	entryFile = join(serverSourceDirectory, entryFile);

	if (!fs.existsSync(entryFile)) {
		print.error`\n  ❌ [white: Could not entry file [bold:'${entryFile}']]\n`;
		return;
	}

	generateSchema({
		servicesFile,
		serverSourceDirectory,
		watch: true,
	});

	esrun(entryFile, {
		watch: true,
	});
}
