import type { Sade } from "sade";

const defineOptions = <
	Options extends Record<string, [string, string, string?]>,
>(
	options: Options,
) => options;

export const options = defineOptions({
	manual: ["--manual", "Manually select options"],
	destination: ["--destination", "Path location"],
	entryFile: ["--entry [file]", "Entry file path"],
	outputFile: ["--output [file]", "Output file resulting from the build"],
	watch: ["--watch", "Pass this option to watch schema changes"],
	verbose: ["--no-logs", "Set to false to prevent console logs"],
	use: ["--use", "Another command to use along the main gravity command"],
	bundleDependencies: [
		"--bundle-dependencies",
		"Bundle dependencies in build output",
	],
	servicesFile: [
		"--services [file]",
		"Path to the file that exports the services",
	],
	schemaFile: [
		"--schema [file]",
		"Path to schema.json file\nCan be a directory; in that case all parents node_modules/.gravity/schema.json will be searched until a match is found",
	],
	schemaless: [
		"--schemaless",
		"Run gravity in schemaless mode. In this mode, gravity will not generate a schema file and will not validate server functions input.",
	],
});

export const bunBuildOptionsProperties: Array<{
	option: string;
	key: string;
	description: string;
	getValue?: (value: string) => unknown;
}> = [
	{ option: "--minify", key: "minify", description: "Minify the output", getValue: (value) => value ? JSON.parse(value) : true },
	{ option: "--format", key: "format", description: "esm | cjs | iife" },
	{ option: "--sourcemap", key: "sourcemap", description: "none | linked | inline | external" },
	{ option: "--target", key: "target", description: "bun | browser" },
];

export const useBunBuildOptions = (program: Sade): Sade => {
	for (const { option, description } of bunBuildOptionsProperties) program.option(option, description);
	return program;
};
