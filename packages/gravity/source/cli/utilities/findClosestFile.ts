import { existsSync } from "fs";
import { join, resolve } from "path";

export function findClosestFile(fileName: string): string | undefined {
	let directory = resolve("");
	while (true) {
		const file = join(directory, fileName);
		if (existsSync(file)) return file;
		const parent = resolve(directory, "..");
		if (parent === directory) return undefined;
		directory = parent;
	}
}
