# We Applet

A *we* applet is a Holochain application and associated UI that's only intended to be used inside the `We` environment. This means that the UI, instead of rendering a full blown web application, only renders the appropriate elements that the `We` framework requests.

At the technical level, a we applet is just a normal `.webhapp`, with 2 main differences from any other web happ:

- UI code:
  - Instead of having the UI have an `index.html` that renders a full blown web app, the UI portion of the `.webhapp` has to export:
    - `index.js`: main file for the applet, define the applet views and its behavior.
    - `styles.css`: CSS stylesheet that will be applied to all the iframes for the applet.

- hApp code:
  - You don't need the profiles zome or any other zome that deals with profiles, as they will be managed by the we group DNA.

##  How to create a we applet

### Scaffolding

This guide assumes you have the [holochain nix environment](https://developer.holochain.org/quick-start/) set up.

1. Run this command: 

```bash
nix run github:holochain/holochain#hc-scaffold -- web-app --templates-url https://github.com/lightningrodlabs/we
```

And run through the instructions for that command.

From this point on, you can continue scaffolding your we applet like any normal holochain app, with commands like `hc scaffold dna` or `hc scaffold zome`. For an introduction on how to scaffold a hApp using the scaffolding tool, go [here](https://developer.holochain.org/get-building/).

### Testing

This template includes very basic testing for your we applet. If you run `npm run start:applet`, it will launch a tauri window simulating we requesting your applet to render your main applet view.

For more thorought testing, you can start the [main we desktop executable](https://github.com/lightningrodlabs/we/releases) in testing mode, by setting the `profile` and `network-seed` CLI arguments.

- `profile` is the name of the internal folder that we will use to store all its data. Changing the profile allows for setting up test networks without losing the data for your default installation of we.
- `network-seed` will override the network seed by which the we and devhub hApps will get installed. This will only be used if they are not yet installed, so this argument is only read the first time we is run for this profile.

In linux, this would be:

```bash
./we_0.0.11_amd64.AppImage --profile test --network-seed test
```

And then publish your applet in that testing network, by following the guide below.

### Publishing applets to the DevHub

This guide assumes you have [we installed in your computer](https://github.com/lightningrodlabs/we/releases).

1. Package your `.webhapp` by running `npm run package:applet` from the root folder of the scaffolded project.
2. Open we, go into the app library of any of your groups, and click the `Publish an applet` button on the top-right corner.
3. This will prompt you to enable the developer mode. Do so and open the DevHub.
4. Follow [this guide to publish your app](https://github.com/holochain/launcher#publishing-and-updating-an-app-in-the-app-store).

By now the applet should be published correctly, and you can use we itself to confirm that it is available as an applet to be installed in any we group.
