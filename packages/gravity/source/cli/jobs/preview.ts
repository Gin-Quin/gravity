import type { GravityCliOptions } from "../GravityCliOptions.js";
import fs from "fs-extra";
import print from "@digitak/print";
import { resolveCliOptions } from "../utilities/resolveCliOptions.js";

export type GravityPreviewOptions = Pick<GravityCliOptions, "outputFile">;

export async function preview(options: GravityPreviewOptions = {}) {
	const { outputFile } = resolveCliOptions(options);

	if (!fs.existsSync(outputFile)) {
		print.error`\n  ❌ [white: Could not find output file [bold:'${outputFile}']]\n`;
		return;
	}

	const child = Bun.spawn([process.execPath, outputFile], { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
	process.exitCode = await child.exited;
}
