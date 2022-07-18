# We Applet

A *we* applet is a Holochain application that's only intended to be used inside the `We` environment. This means that instead of rendering a full blown web application, it only renders the appropriate elements that the `We` framework requests.

At the technical level, a we applet is just a normal `.webhapp`, with 2 main differences to any other web happ:

- UI code:
  - Instead of having the UI have an `index.html` that renders a full blown web app, the UI portion of the `.webhapp` has to export an `index.js` to define the elements it's renderering, and an `icon.png`.

- hApp code:
  - You don't need the profiles zome or any other zome that deals with profiles, as they will be managed by the we group DNA.

##  How to create a we applet

This guide assumes that you have the [Holochain Launcher](https://github.com/holochain/launcher) already installed in your computer, and the `We` app installed in your Launcher. 

0. If you don't have a happ or module scaffolded yet, scaffold one by running `npm init @holochain` and completing its instructions.
1. Go into the happ in which you want to create the applet, and run [the applet scaffolding tool follow all the instructions to setup the applet](https://www.npmjs.com/package/@lightningrodlabs/create-we-applet).
2. Develop your UI code in `we-applet/src/index.ts`, complying with the `WeApplet` interface defined in [@lightningrodlabs/we-applet](https://www.npmjs.com/package/@lightningrodlabs/we-applet).
3. Package your `.webhapp` by going into the `we-applet` folder and running `npm run package`.
4. Publish the applet into the devhub, with this **required tag**: `we-applet`.

By now the applet should be published correctly, and you can use the we app that you have installed in your Launcher to confirm that it is available as an applet to be installed in any we group.