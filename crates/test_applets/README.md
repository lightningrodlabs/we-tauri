# we-test-applets

CLI to launch a we instance to test applets, useful only during development of them.

## Install

If you want to install it from source:

```
cargo install we-test-applets --git https://github.com/lightningrodlabs/we
```

In the future, we could set up a flake.nix and cachix instances so that you can cache this binary.

## Example Usage

0. Run `hc run-local-services`:

```bash
hc run-local-services
```

1. Launch an applet .webhapp installed within a group, pointing to the ports given by the `hc run-local-services` command:

```bash
we-test-applets path/to/my/first/applet.webhapp path/to/my/second/applet.webhapp network --network-seed myappletnetworkseed --bootstrap http://127.0.0.1:<BOOTSTRAP_SERVICE_PORT> webrtc ws://127.0.0.1:<SIGNAL_SERVER_PORT>
```

You can launch other instances for the same group and applets by executing exactly the same command in another terminal, or using `concurrently` if your setup is using npm scripts.

## Help

You can inspect all the options that `we-test-applets` offers by running:

```
we-test-applets --help
```

## Limitations

- There is currently no way run run two separate tauri instances from the same binary. This is why we can't have a "--number-of-agents" argument, and we need to run a separate command for each agent.
- The icon for the applet won't be shown, as it needs to be fetched from the app store, and the applet itself is not published to the app store to test it.
