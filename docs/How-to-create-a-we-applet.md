# We Applet

A *we* applet is a Holochain application and associated UI that's only intended to be used inside the `We` environment. This means that the UI, instead of rendering a full blown web application, only renders the appropriate elements that the `We` framework requests.

At the technical level, a we applet is just a normal `.webhapp`, with 2 main differences from any other web happ:

- UI code:
  - Instead of having the UI have an `index.html` that renders a full blown web app, the UI portion of the `.webhapp` has to export:
    - `index.js`: main file for the applet, define the applet views and its behavior.
    - `icon.png`: icon for the applet.
    - `styles.css`: CSS stylesheet that will be applied to all the iframes for the applet.

- hApp code:
  - You don't need the profiles zome or any other zome that deals with profiles, as they will be managed by the we group DNA.

##  How to create a we applet

This guide assumes you have the [holochain nix environment](https://developer.holochain.org/quick-start/) set up.

1. Run this command: 

```bash
nix run github:holochain/holochain#hc-scaffold -- web-app --templates-url https://github.com/lightningrodlabs/we-applet
```

And run through the instructions for that command.

From this point on, you can continue scaffolding your we applet like any normal holochain app, with commands like `hc scaffold dna` or `hc scaffold zome`. For an introduction on how to scaffold a hApp using the scaffolding tool, go [here](https://developer.holochain.org/get-building/).

## Publishing a we applet

This guide assumes you have [we installed in your computer]().

1. Package your `.webhapp` by running `npm run package:applet` from the root folder of the scaffolded project.
2. Open we, go into the app library of any of your groups, and click the `Publish an applet` button on the top-right corner.
3. Publish the applet into the devhub, with this **required tag**: `we-applet`.

By now the applet should be published correctly, and you can use we itself to confirm that it is available as an applet to be installed in any we group.
