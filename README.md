# Gravity

**Gravity** is a full-stack RPC framework that provides **end-to-end typesafe APIs** and reactive client stores.

👉 Read the [documentation](https://digitak-gravity.netlify.app/docs)

👉 [Get started](https://digitak-gravity.netlify.app/docs/getting-started/installation)

## Development

Use Bun 1.4.4 or newer for the runtime, workspaces, package management, type checking,
JavaScript builds, tests, and publishing. Workspace dependencies resolve directly
from TypeScript sources, so a clean checkout can be checked before anything is built.

```sh
bun install --frozen-lockfile
bun run check
bun run test
bun run build
```

`bun run build` checks types before generating artifacts. The shared TypeScript build
script uses native `bun build` to preserve public modules and emits `.d.ts` files
with the TypeScript compiler API running under Bun. Generated files live in each
package's `package/` directory. See [AGENTS.md](AGENTS.md) for the project structure
and contribution conventions.

## Publishing

Check every package without credentials or publishing:

```sh
bun run deploy --dry-run
```

The dry run uses `bun pm pack --dry-run` to validate packages locally. It does
not require registry credentials.

Publishing is manual from your machine. Sign in to your npm account locally;
Bun reads credentials from your user-level `.npmrc` or `NPM_CONFIG_TOKEN`. Do
not commit credentials. Run these commands from the repository root and complete
any browser or OTP prompts Bun presents:

```sh
bun pm whoami
bun run deploy
```

The release script checks, builds, validates, and publishes the ten compiled
packages in dependency order. It verifies each publication against the registry.
If a release fails partway through, fix the error and rerun `bun run deploy`:
versions already published are skipped. Expired local credentials require signing
in again, but there is no per-package trusted publisher setup.

For a subsequent patch release, use `bun run deploy --bump`. This updates the root
and all workspace versions and refreshes `bun.lock`. Retry a partial release
without `--bump` to keep the same version. Review and commit release changes
(for example, `📌 Version 0.9.70`), then push them yourself. GitHub Actions does
not run checks or publish packages; run the local checks before each release.
