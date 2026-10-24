# Gravity

Gravity is a TypeScript RPC framework with end-to-end typed APIs, schema-based
validation, streaming, and reactive client stores.

## Structure

- `packages/gravity/source/`: core API, services, handlers, stores, and Gravity CLI.
- `packages/gravity/templates/`: project templates embedded by the CLI generator.
- `packages/create-gravity/`: interactive project scaffolding command.
- `packages/gravity-*/`: React, Next, Svelte, SvelteKit, Solid, Vue, Nuxt, and Prisma integrations.
- `packages/*/test/`: integration examples and fixtures.
- `packages/*/package/`: generated release artifacts; edit source files instead.
- `scripts/`: shared TypeScript build, release, and verification scripts.
- `documentation/`: documentation site and guides.
- `.github/workflows/`: CI checks.

## Tooling

- Use Bun 1.4.4 or newer for execution, dependencies, workspaces, tests, and publishing.
- Use `bun install`; maintain `bun.lock` and the root `package.json` workspaces.
- Use `workspace:*` for dependencies between packages.
- Use TypeScript for scripts and `bun:test` for automated tests.
- Run `bun check` before every build. A failed check must prevent building.
- Build JavaScript with `bun build` or `Bun.build()`. The shared build script emits
  declarations separately using the TypeScript compiler API under Bun.
- Use `bun run build`, `bun run deploy --dry-run`, and `bun run deploy` from the root.
- Do not introduce Node.js, npm, pnpm, esrun, or esbuild commands or direct dependencies.
- Keep project templates, documentation, and CI consistent with Bun tooling.
- `@digitak/bunker` is pinned to 3.3.6 to avoid its later runtime runner dependency.
  The newer streaming helper lives in `source/utilities/decodeStream.ts`; preserve
  binary compatibility and run the serialization tests when changing the codec.

## Git conventions

- Use branch names such as `feat/…` or `fix/…`; never prefix them with `codex/`.
- Inspect recent commit subjects and follow their existing style.
- Use a gitmoji and plain English for pull request titles.
