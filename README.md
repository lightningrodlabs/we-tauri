# we

Creating a group coherence with holochain apps

##  Background

A key component of group coherence, is that the members of the group know the "rules of the games" that they are playing together.  Since every Holochain DNA is fundamentally a "rules of a game", we can create a powerful group coherence tool by making it easy to compose DNAs and their UIs inside of a membrane of people.  **We** is a DNA and UI that provides this functionality, along with a pattern on how to declare and share functionality across the sub-DNAs that are composed into the group.

## Design

For more details read the [design documents](DESIGN.md).

## Installation

1. Install the holochain dev environment: https://developer.holochain.org/docs/install/
2. Clone this repo: `git clone https://github.com/holochain/we && cd ./we`
3. Enter the nix shell: `nix-shell`

## Building the DNA

- Build the DNA (assumes you are still in the nix shell for correct rust/cargo versions from step above):
  - Assemble the DNA:

```bash
npm run build:happ
```

### Running the DNA tests
```bash
npm run test
```

## UI

To test out the UI:

``` bash
npm run start
```

## Package

To package the web happ:

``` bash
npm run package
```

You'll have the `we.webhapp` in `workdir`, and it's component `we.happ` in `dna/workdir/happ`, and `ui.zip` in `ui/apps/we`.


## License
[![License: CAL 1.0](https://img.shields.io/badge/License-CAL%201.0-blue.svg)](https://github.com/holochain/cryptographic-autonomy-license)

  Copyright (C) 2021, Harris-Braun Enterprises, LLC

This program is free software: you can redistribute it and/or modify it under the terms of the license
provided in the LICENSE file (CAL-1.0).  This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
