{
  description = "Template for Holochain app development";

  inputs = {
    android.url = "github:tadfisher/android-nixpkgs";

    versions.url  = "github:holochain/holochain?dir=versions/0_1";

    holochain-flake.url = "github:holochain/holochain";
    holochain-flake.inputs.versions.follows = "versions";

    rust-overlay.url = "github:oxalica/rust-overlay";

    nixpkgs.follows = "holochain-flake/nixpkgs";
    flake-parts.follows = "holochain-flake/flake-parts";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake
      {
        inherit inputs;
      }
      {
        systems = builtins.attrNames inputs.holochain-flake.devShells;
        perSystem =
          { inputs'
          , config
          , pkgs
          , system
          , lib
          , self'
          , ...
          }:      
          let
            overlays = [ (import inputs.rust-overlay) ];
            rustPkgs = import pkgs.path {
              inherit system overlays;
            };
            rust = rustPkgs.rust-bin.stable."1.66.1".default.override {
              extensions = [ "rust-src" ];
              targets = [ 
                "i686-linux-android"
                "aarch64-unknown-linux-musl"
                "wasm32-unknown-unknown"
                "x86_64-pc-windows-gnu"
                "x86_64-unknown-linux-musl"
                "x86_64-apple-darwin"
                "aarch64-linux-android"
              ];
            };
            sdkPkgs = inputs.android.sdk.${system} (sdkPkgs: with sdkPkgs; [
                  cmdline-tools-latest
                  build-tools-32-0-0
                  platform-tools
                  platforms-android-31
                  emulator
                ]);
            in {
            devShells.default = pkgs.mkShell {
              inputsFrom = [ inputs'.holochain-flake.devShells.holonix ];
              packages = (with pkgs; [
                nodejs-18_x
                # more packages go here
                cargo-nextest
              ])
              ++ ([
                rust
                sdkPkgs
              ])
              ;
              
              buildInputs = (with pkgs; [
                openssl

                # this is required for glib-networking
                glib
              ])
              ++ (lib.optionals pkgs.stdenv.isLinux
                (with pkgs; [
                  webkitgtk.dev
                  gdk-pixbuf
                  gtk3
                  # Video/Audio data composition framework tools like "gst-inspect", "gst-launch" ...
                  gst_all_1.gstreamer
                  # Common plugins like "filesrc" to combine within e.g. gst-launch
                  gst_all_1.gst-plugins-base
                  # Specialized plugins separated by quality
                  gst_all_1.gst-plugins-good
                  gst_all_1.gst-plugins-bad
                  gst_all_1.gst-plugins-ugly
                  # Plugins to reuse ffmpeg to play almost every video format
                  gst_all_1.gst-libav
                  # Support the Video Audio (Hardware) Acceleration API
                  gst_all_1.gst-vaapi
                  libsoup_3
                ]))
              ++ lib.optionals pkgs.stdenv.isDarwin
                (with pkgs; [
                  darwin.apple_sdk.frameworks.Security
                  darwin.apple_sdk.frameworks.CoreServices
                  darwin.apple_sdk.frameworks.CoreFoundation
                  darwin.apple_sdk.frameworks.Foundation
                  darwin.apple_sdk.frameworks.AppKit
                  darwin.apple_sdk.frameworks.WebKit
                  darwin.apple_sdk.frameworks.Cocoa
                ])
              ;

              nativeBuildInputs = (with pkgs; [
                perl
                pkg-config

              ])
              ++ (lib.optionals pkgs.stdenv.isLinux
                (with pkgs; [
                  wrapGAppsHook
                ]))
              ++ (lib.optionals pkgs.stdenv.isDarwin [
                pkgs.xcbuild
                pkgs.libiconv
              ])
              ;

              shellHook = ''
                export GIO_MODULE_DIR=${pkgs.glib-networking}/lib/gio/modules/
                export GIO_EXTRA_MODULES=${pkgs.glib-networking}/lib/gio/modules
                export WEBKIT_DISABLE_COMPOSITING_MODE=1
                unset CARGO_TARGET_DIR
                unset CARGO_HOME
              '';
            };
          };
      };
}
