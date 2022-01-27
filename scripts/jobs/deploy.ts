import workspaces from "../../workspaces.json";
import { print } from "@digitak/print";
import { execute } from "./../utilities/execute";
import path from "path";
import { build } from "./build";

export async function deploy() {
	await build();

	print`[yellow: Starting deploy...]`;

	try {
		await Promise.all(
			workspaces.map(async (workspace) => {
				const cwd = path.resolve(`${workspace}/package`);

				await execute(`npm publish`, { cwd });
				print`[blue: [bold:${workspace}] • Publication successful 🤗]`;
			}),
		);
	} catch (error) {
		// print`[red: －－－ [bold:${workspace}] • An error occured during deploy －－－]`;
		print`[red: －－－ An error occured during deploy －－－]`;
		console.log(error, "\n");
		process.exit(1);
	}

	print`\n[green.bold: Deploy done 🎉]\n`;
}
