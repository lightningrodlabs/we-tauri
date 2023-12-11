<h1 align="center">
  <div>👋 Welcome to</div>
  <img src="https://neighbourhoods.network/visual-assets/nh-white-banner.png" alt="Logo" width="500">
  <div>Neighbourhoods Launcher</div>
</h1>

<div align="center">

[![Join the Neighbourhoods discord server](https://img.shields.io/discord/854211588184735774.svg?label=&logo=discord&logoColor=ffffff&color=5865F2)](https://discord.gg/neighbourhoods)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-ff69b4.svg?)](https://github.com/neighbour-hoods/nh-launcher/issues)
[![made with hearth by neighbourhoods](https://img.shields.io/badge/made%20with%20%E2%99%A5%20-cc14cc.svg?)](https://github.com/neighbour-hoods)

</div>

The Neighbourhoods Launcher, a Holochain app, is a common entryway into creating and joining p2p networks called Neighbourhoods. Using the Launcher, you can build and join Neighbourhoods that use NH-compatible "applets" along with the social-sensemaker. 

Using the Launcher, one can create and access personal profiles, search for and join existing neighbourhoods, and add/configure applets into a neighbourhood. The Launcher is also where members can invite each other and interact using applets. Eventually, the Launcher will support inspection of the social sensemaker dashboard. 

NOTE: You may encounter slow/tedious data refresh and difficulty in multi-agent environments due to a known issue.  

## Running the Neighbourhoods Launcher

1. [Install Nix on your system](https://nixos.org/download#download-nix).
2. Clone this repo (**IMPORTANT**: in `develop` branch): `git clone https://github.com/neighbour-hoods/nh-launcher && cd ./nh-launcher && git checkout develop`
3. Enter the nix shell: `nix develop` (if you are having issues with this command, see: https://hackmd.io/BKCt3FckSiSDJ4aSJ1Ur6A, as you may have to enable nix commands with the following terminal commands: `mkdir -p ~/.config/nix && echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf`)
4. Install the dependencies: `pnpm install`
  - If you don't already have a comfigured `.env` file, it will copy `.env.example` to `.env`. If you do have an existing `.env` file, please be sure to update it to have all the variables from the example file.
5. Run the NH Launcher by running one of the follwing options (not all options work bug free, so please report any bugs you find):
  - Start up a single holochain agent in single browser window: `pnpm run dev` (browser opens after 20 seconds sleep, if the interface doesn't render, check the logs and refresh if there's no objevious error)
  - Start up two holochain agents in two browser windows: `pnpm run dev2` (browser opens after 20 seconds sleep, if the interface doesn't render, check the logs and refresh if there's no objevious error)
  - Start up two holochain agents using hc launch: `pnpm start`
6. Stop the local services once you're done: `pnpm run stop:local-services`

The above scripts all take care of the messy details of running the launcher (or any other multi agent system in Holochain). However, if you're interested in understanding what happens behind the scenes:
- build everything (`pnpm run build:nh`)
- start the bootstrap and signaling servers (`pnpm run start:local-services`)
- clean the holochain sandbox (`pnpm run clean:sandbox`)
- start up the holochain sandbox (this is a complicated command and is beyond the scope of these docs)
- start watching the filesystem for changes to files and rebuild
- either launch the launcher or the browser

### Building the DNA

Build the DNA (assumes you are still in the nix shell for correct rust/cargo versions from the step above):

```bash
npm run build:happ
```

### Running the UI tests

```bash
npm run test:ui
```

### UI

To test out the UI:

(for a Tauri environment)
``` bash
npm run start
```

(for a browser environment)
``` bash
npm run dev2
```

## Developing Apps

To help develop applications, we've added a placeholder `applet-dev-workspace` directory to the project. This allows applet devs to use the same nix environment, holochain version, and other libraries. See the [./applet-dev-workspace/README.md] for more info.

## License

The NH Launcher is based on a fork of Lightning Rod Labs *We*

[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2021, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
