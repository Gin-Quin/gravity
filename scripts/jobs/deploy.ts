import { print } from "@digitak/print";
import { execute } from "./../utilities/execute";
import path from "path";
import { bumpVersion } from "../utilities/bumpVersion";
import { updateWorkspacesVersion } from "../utilities/updateWorkspacesVersion";
import { packages } from "../utilities/workspace";

export async function deploy() {
	// update all pacakge versions
	const version = bumpVersion();
	updateWorkspacesVersion();

	// push new versions to git
	await execute(`git add .`);
	await execute(`git commit -m "📌 Version ${version}"`);
	await execute(`git push`);

	// run build with turbo
	print`[yellow: Starting build...]`;
	await execute("npm run build");

	// TODO: add tests

	// deploy to npm
	print`[yellow: Starting deploy...]`;
	try {
		await Promise.all(
			packages.map(async (packageName) => {
				const cwd = path.resolve(`${packageName}/package`);

				console.log("NODE_AUTH_TOKEN", process.env.NODE_AUTH_TOKEN);

				await execute(`npm publish --access public`, {
					cwd,
					env: {
						...process.env,
					},
				});
				print`[blue: [bold:${packageName}] • Publication successful 🤗]`;
			}),
		);
	} catch (error) {
		// print`[red: －－－ [bold:${pack}] • An error occured during deploy －－－]`;
		print`[red: －－－ An error occured during deploy －－－]`;
		console.log(error, "\n");
		process.exit(1);
	}

	print`\n[green.bold: Deploy done 🎉]\n`;
}
