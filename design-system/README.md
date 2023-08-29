# Neighbourhoods design system components (and Storybook) UNSTABLE

Currently this package exports these components, all of which are under development but act as a good starting point for building Neighbourhoods UI:

## Base Components
(Comprising of the LitElement ancestor components from the `neighbourhoods-design-system-components` package - now deprecated). Use these as a base if you just want to inherit styles:

`NHComponent` - Just the NH design token CSS variables

`NHComponentShoelace` - In future we will add some Shoelace variable overrides so use this to include them too 

## NH Components
`NHButton`

`NHButtonGroup`

`NHCard`

`NHPostCard`

`NHCardList`

`NHTabButton`

`NHPagination`

`NHPageHeaderCard`

`NHAssessmentWidget`

`NHMenu` -- currently same as NHButtonGroup

## NH Shoelace Components (use `sl-` webcomponents internally)
`NHDialog`

`NHAlert`

`NHCreatePost`

## Install

```bash
pnpm install
```

## Storybook

```bash
npm run storybook
```

## Build

```bash
npm run build
```

Original repo forked from Leon Radley (thanks!)
https://leon.id/articles/web-components/2022-02-vite-lit-storybook