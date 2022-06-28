# @lightningrodlabs/create-we-game

Easily scaffold a [We Game](https://npmjs.com/package/@lightningrodlabs/we-game) UI package.

## Usage

Run this in the project subfolder where you want to create the game:

```bash
npx @lightningrodlabs/create-we-game [GAME NAME]
```

For example:

```bash
npx @lightningrodlabs/create-we-game notebooks
```

This will create a `we-game` folder, with the necessary setup to create a We Game. This would usually be a small NPM workspace inside a bigger repository.

If your project was scaffolded using `npm init @holochain-open-dev`, here are your next steps:

1. In your root `package.json`:
   1. Include the newly scaffolded package in the `workspaces` field.
   2. Add a "start:game" script with this content (this will allow you to test that your game is good to go):
`"start:game": "cross-env HC_PORT=$(port) ADMIN_PORT=$(port) concurrently \"npm run playground\" \"npm run start:happ\" \"npm run start -w we-game\""`
2. In the `we-game` package, add the dependency to your local package where your elements and store live, and run `npm install` from the root folder of the repository.
3. In the `we-game/src/[GAME NAME]-game.ts` file:
   1. Instantiate your store in the `firstUpdated` function.
   2. Add your elements to the `static get scopedElements()` getter.
   3. Add your elements to the HTML for them to render appropriately.