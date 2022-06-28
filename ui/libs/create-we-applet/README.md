# @lightningrodlabs/create-we-applet

Easily scaffold a [We Applet](https://npmjs.com/package/@lightningrodlabs/we-applet) UI package.

## Usage

Run this in the project subfolder where you want to create the applet:

```bash
npx @lightningrodlabs/create-we-applet [APPLET NAME]
```

For example:

```bash
npx @lightningrodlabs/create-we-applet notebooks
```

This will create a `we-applet` folder, with the necessary setup to create a We Applet. This would usually be a small NPM workspace inside a bigger repository.


If your project was scaffolded using `npm init @holochain-open-dev`, here are your next steps:

1. In your root `package.json`:
   1. Include the newly scaffolded package in the `workspaces` field.
   2. Add a "start:applet" script with this content (this will allow you to test that your applet is good to go):
`"start:applet": "cross-env HC_PORT=$(port) ADMIN_PORT=$(port) concurrently \"npm run playground\" \"npm run start:happ\" \"npm run start -w we-applet\""`
2. In the `we-applet` package, add the dependency to your local package where your elements and store live, and run `npm install` from the root folder of the repository.
3. In the `we-applet/src/[APPLET NAME]-applet.ts` file:

   1. Instantiate your store in the `firstUpdated` function.
   2. Add your elements to the `static get scopedElements()` getter.
   3. Add your elements to the HTML for them to render appropriately.