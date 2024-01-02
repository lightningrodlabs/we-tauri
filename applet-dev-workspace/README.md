# Applet Development Workspace

This special gem of a directory is configured to hold applets that can be used as part of the larger pnpm workspace. This means any dev can use the same nix evironment and development versions of things that are present in the larger workspace. All one needs to do is place a project in the directory and replace any `package.json` versions of `@neighbourhoods/client` with `workspace:*`.
