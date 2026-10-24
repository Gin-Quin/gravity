## 0.9.63

This archive describes earlier releases. Current development and builds use Bun;
see the project README for current commands.

- make `schema` optional

## 0.9.62

- add streaming support by allowing to return a `GravityStream` value

## 0.9.61

- fix URL parsing for Bun and other base middlewares

## 0.9.60

- fix URL decoding following path name changes

## 0.9.58

- use pathname to macth api paths

## 0.9.57

- fix an error with `schemaless` mode for some environments

## 0.9.56

- add `schemaless` mode to run Gravity without schema generation / input validation

## 0.9.55

- update SvelteKit supported versions

## 0.9.54

- native support for Bun and Deno handlers

## 0.9.53

- metadata stores now use symbols as keys to prevent mixing up different tags

## 0.9.52

- upgrade to svelte 4
- add service and path to `onRequestReceive`, that can be used to check if authentication is necessary and speed up response time when it is not

## 0.9.51

- allow "*" origin.

## 0.9.50

- add the name of the service and path to the "bad parameters" error, for easier debugging.

## 0.9.49

- handle offline with `persist` option.
- don't try to fetch data when the browser knows it's offline.

## 0.9.48

- fix `parseCookies` export.

## 0.9.47

- display full errors server-side for easier debugging.

## 0.9.46

- add `@ContentType` decorator to handle custom content types.
- update bunker version with a fix to handle large strings.

## 0.9.45

- use typezer@0.9.30

## 0.9.44

- `onResponseSend` get two new parameters: `data` or `error`. Useful to catch all errors that happen server-side.

## 0.9.40

- indicate that `refresh` is a promise that returns nothing

## 0.9.39

- fix BaseService constructor parameters

## 0.9.38

- remove SvelteKit's server-side rendering, that was not compatible with recent versions of SvelteKit

## 0.9.37

- update the script runner to version 3.2.11 with important fixes for windows and the watcher.
- in Node middleware, execute the user callback `onResponseSend` before the response is actually sent. This allows to set special headers before it is definitely sent.

## 0.9.36

- `gravity preview` now displays logs.

## 0.9.35

- apply new the script runner dependency strategy to `gravity build`, which add support for typescript aliases starting with a letter when running `gravity build`.

## 0.9.34

- update the script runner to version 3.2.8 that add support for typescript aliases starting with a letter when running `gravity dev`.

## 0.9.33

- `gravity build` now works the same as `gravity dev`: dependencies are not bundled by default. It is still possible to bundle the dependencies with the `--bundle-dependencies` option
- add the option `--no-logs` to the `gravity build` command
- update bundler version (now 0.14.47)
- add documentation for build strategies

## 0.9.32

- fix `gravity build` bug caused by the processing of bundler options

## 0.9.31

- fix crash on void functions when encoding / decoding with JSON
- add persistence option to store data in a local IndexedDB database
- forbid to set `cache` option to `false` for the frameworks that are not compatible (React, Vue and Solid) and print a warning

## 0.9.30

- fix handler usage in documentation (Gravity as middleware) and in templates

Thanks to **@omar-dulaimi** for the fix 🎉

## 0.9.29

- update to script runner version 3.2.5 which fix watching
- update to typezer@0.9.26 that brings automatic `tsconfig.json` detection and enable to use path aliases (returned `any` on a type issued from a path alias)

## 0.9.28

- update to bunker@3.3.5 which fix a bug with typed arrays

## 0.9.27

- update to bunker@3.3.4 which supports typed arrays

## 0.9.26

- use Typezer@0.9.24 which fix optional parameters validation
- add changelog to the documentation
- add "for Typescript" in main page
- remove Prisma integration from the doc for now. Prisma types can get so complicated (ex: create input for a model with a relation) that the schema becomes super-huge

## 0.9.25

- fix React stores. Zustand was not used correctly.
- fix documentation for Solid stores. Unlike React, reactive stores with Solid need `createMemo`.

## 0.9.24

- remove wild console logs

## 0.9.23

- use typezer@^0.9.22 that improves error messages
- add Twitter link to the homepage

## 0.9.22

- use typezer@^0.9.21 that fix bug of optional parameters allowing undefined values

## 0.9.21

- await for promises in api and store
- fix some test imports

## 0.9.20

- add doc for `esModuleInterop` when working with prisma

## 0.9.19

- fix defineApi type for svelte-kit

## 0.9.18

- add more advanced example
- fix secondary text color for dark theme
- make icon animation not so aggressive for CPU
- fix subtraction example in the main page that was actually performing an addition
- create this changelog 🎉
