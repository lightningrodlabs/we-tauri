# We

*We* is a Holochain runtime that makes it trivially easy for groups to build collaboration spaces by composing custom "applet" suites to meet their collaboration needs. 

*We* is composed of a group management DNA, together with a defined pattern on how to build *applet* DNAs that are can be installed into a *We* group. Each such group as well as each *applet* used within a group is its own private peer-to-peer network.

For more about the motivation behind *We*, read [this blogpost](https://eric.harris-braun.com/blog/2022/07/26/id-390).

## Design

For details about the design, read the [design document](docs/Design.md).

## Creating We applets

The details on how to create a *we applet* can be found [here](docs/How-to-create-a-we-applet.md).

## Installation

Go to [the releases page](https://github.com/lightningrodlabs/we/releases) and download the latest release for your OS.

## Developer Setup

### Installing the repository

1. Install the holochain dev environment: https://developer.holochain.org/docs/install/
2. Clone this repo: `git clone https://github.com/lightningrodlabs/we && cd ./we`
3. Enter the nix shell: `nix develop`
4. Run: `npm install`

### Running the DNA tests

```bash
npm test
```

### UI

To start only one agent:

``` bash
npm start
```

To start two agents:

``` bash
npm run network
```

### Testing with applets

If you already have applets web-happs to test with, add them in the `testing-applets` folder and run `npm start`.

The `scripts/publish-applets.js` is going to be executed, which will publish the applets `.webhapp` files that it finds in the `testing-applets` folder.

Note that you need to enter the password in the tauri window before the publishing can begin.

To check whether this has finished, look in the terminal for the log: `Published applet: gather`

### Building

To build *We*:

``` bash
npm run build
```

Tauri will build the executable for your platform and notify you of its location.

## License
[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2021, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
