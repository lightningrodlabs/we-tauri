# Neighbourhoods Storybook repository developer documentation


## Publishing to NPM and other package registries

- Ensure all packages requiring publication have their `version` field in `package.json` updated to reflect the next 
  version to be published. Ensure all changes are committed and pushed and that the working copy is not dirty.
- Ensure a successful `pnpm run build` completes after the version updates are made.
- Run `pnpm -r publish --access public` from the root directory to publish all packages with updated versions.
- Tag the new version/s and push the `git push --tags` to our shared remote.




## Developing locally within downstream projects

If you are building an Neighbourhoods Applet or other UI application then you
may find it useful to be able to live-edit code in the Storybook and have it
linked to the target application in question.

To set this up you can simply run the following from wherever you are consuming
the associated Neighbourhoods UI module from NPM:

```bash
pnpm link /path/to/this/repo/design-system
```

(Substituting whichever subdirectory your ESModule's `package.json` file is located in.)




## Understanding compilation targets and the build system

This repository is a monorepo containing separate but interrelated packages used
in Neighbourhoods user interface applications.

At the top level of the workspace, the Storybook runner packages and scripts are
managed. When run in this mode through various `storybook` commands there is a
single project-wide `tsconfig.json` which manages build artifacts *in memory*
via [Vite](https://vitejs.dev/).

Within each UI module subdirectory (eg. `design-system`, `dev-util`) there are 
also configurations used in managing this build and separate on-disk output.
Managing these distinctions requires creative use of the `paths` field in
TypeScript's configuration files.

An example can be seen in the dependency between 
`@neighbourhoods/dev-util-components` and `@neighbourhoods/design-system-components`.


### Registering a new ESModule with the build system

- In `pnpm-workspace.yaml` add the new ESModule directory to the list
- In the repository-level `tsconfig.json`:
    - Add additional entries under `paths`, mapping the new module name & exports to the associated *source* file paths.
- In the new ESModule directory, add two new TypeScript config files which `extends` from the root-level `tsconfig.base.json`:
    - Add a new `tsconfig.json` file which `references` the root `tsconfig.json`  
      > This enables these modules to be picked up by the repository-level 
        Storybook / Vite build process and compiled **for Storybook** 
        (mostly during development).
    - Add a new `tsconfig.build.json` referenced in an isolated `package.json` build script  
      > This will compile the module **for external consumers**.  
      > All `**/*.stories.*` files should be added to the `exclude` list to avoid including them in packaged modules on NPM.
- In the new ESModule directory, copy a new `vite.config.js` and setup a `build` script in `package.json` as
  `vite build && tsc -p ./tsconfig.build.json`.


### Configuring cross-module dependencies

- In the dependant (consuming) ESModule directory:
    - Add a reference to the dependency (providing) ESModule using PNPM's `workspace:*` syntax.
    - Add additional entries under `paths`, mapping the new module name & exports to the associated *built* (not source) 
      file paths (as determined by the dependency (providing) ESModule)
        - Ensure any dependency ordering is reflected in the top-level `package.json`'s `build` script.
