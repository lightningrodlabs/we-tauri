# NH Launcher

The Neighbourhoods Launcher, a Holochain app, is a common entryway into creating and joining p2p networks called Neighbourhoods. Using the Launcher, you can build and join Neighbourhoods that use NH-compatible "applets" along with the social-sensemaker. 

Using the Launcher, one can create and access personal profiles, search for and join existing neighbourhoods, and add/configure applets into a neighbourhood. The Launcher is also where members can invite each other and interact using applets. Eventually, the Launcher will support inspection of the social sensemaker dashboard. 

NOTE: You may encounter slow/tedious data refresh and difficulty in multi-agent environments due to a known issue.  

## Installation

### Installation via the Holochain Launcher

NH Launcher can be installed within the Holochain launcher. For instructions on how to install the launcher, see the corresponding [github repository](https://github.com/holochain/launcher).

### Installation for Development

#### Installing the repository

1. Install the holochain dev environment: https://developer.holochain.org/docs/install/
2. Clone this repo (**IMPORTANT**: in `develop` branch): `git clone https://github.com/neighbour-hoods/nh-launcher && cd ./nh-launcher && git checkout develop`
3. Enter the nix shell: `nix develop` (if you are having issues with this command, see: https://hackmd.io/BKCt3FckSiSDJ4aSJ1Ur6A, as you may have to enable nix commands with the following terminal commands: `mkdir -p ~/.config/nix && echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf`)
4. Run: `npm install`

#### Building the DNA

Build the DNA (assumes you are still in the nix shell for correct rust/cargo versions from the step above):

```bash
npm run build:happ
```

#### Running the DNA tests

```bash
npm run test
```

#### UI

To test out the UI:

``` bash
npm run start
```

#### Package

To package the web happ:

``` bash
npm run package
```

You'll have the `we.webhapp` file in the `/workdir` folder and it's components `we.happ` and `ui.zip` in `dna/workdir/happ` and `ui/apps/we` respectively.

## License

The NH Launcher is based on a fork of Lightning Rod Labs *We*

[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2021, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
