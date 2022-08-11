# We

*We* is a Holochain app that makes it trivially easy for groups to build collaboration spaces by composing custom "applet" suites to meet their collaboration needs. 

*We* is composed of two management DNA's, together with a defined pattern on how to build *applet* DNAs that are can be installed into a *We* group. Each such group as well as each *applet* used within a group is its own private peer-to-peer network.

For more about the motivation behind *We*, read [this blogpost](https://eric.harris-braun.com/blog/2022/07/26/id-390).

## Design

For details about the design, read the [design document](docs/Design.md).

## Creating We applets

The details on how to create a *we applet* can be found [here](docs/How-to-create-a-we-applet.md).

## Installation

### Installation via the Holochain Launcher

*We* can be installed within the Holochain launcher. For instructions on how to install the launcher, see the corresponding [github repository](https://github.com/holochain/launcher).

### Installation for Development

#### Installing the repository

1. Install the holochain dev environment: https://developer.holochain.org/docs/install/
2. Clone this repo: `git clone https://github.com/lightningrodlabs/we && cd ./we`
3. Enter the nix shell: `nix-shell`
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
[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2021, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
