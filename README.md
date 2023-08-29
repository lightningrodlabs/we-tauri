# Neighbourhoods UI Component Storybook [UNSTABLE]

Metarepo for various CustomElement component libraries used in Neighbourhoods Applets and within the [Neighbourhoods Launcher](https://github.com/neighbour-hoods/nh-launcher/):

- The [Design System Components](src/design-system) implementing abstract and harmoniously coordinated UI controls which operate well together.
- [Developer Utility Components](src/dev-util) useful in Applet development & testing.

## Install

Ensure you have the PNPM package manager installed first with `npm i -g pnpm`.

```bash
pnpm install
```

## Storybook

```bash
pnpm run storybook
```

## Build

```bash
pnpm run build
```

## Publish

- Ensure all packages requiring publication have their `version` field in `package.json` updated to reflect the next version to be published.
- Ensure a successful `pnpm run build` completes after the version updates are made.
- Run `pnpm -r publish --access public` from the root directory to publish all packages with updated versions.

## Credits

Original repo forked from Leon Radley (thanks!)  
https://leon.id/articles/web-components/2022-02-vite-lit-storybook

## License

Apache 2.0
