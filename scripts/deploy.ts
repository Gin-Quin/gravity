import { deploy } from "./jobs/deploy.ts";

try {
	await deploy(process.argv.slice(2));
} catch (error) {
	console.error(`\nRelease failed: ${error instanceof Error ? error.message : error}`);
	process.exitCode = 1;
}
