{
  description = "Template for Holochain app development";

  inputs = {
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
            rust = rustPkgs.rust-bin.stable.latest.default.override {
              extensions = [ "rust-src" ];
              targets = [ 
                "x86_64-linux-android"
                "i686-linux-android"
                "aarch64-unknown-linux-musl"
                "wasm32-unknown-unknown"
                "x86_64-pc-windows-gnu"
                "x86_64-unknown-linux-musl"
                "x86_64-apple-darwin"
                "aarch64-linux-android"
              ];
            };
            androidPkgs = import pkgs.path {
              inherit system;
              config = {
                android_sdk.accept_license = true;
                allowUnfree = true;
              };
            };

            buildToolsVersion = "30.0.3";
            ndkVersion = "25.2.9519653";
            androidComposition = androidPkgs.androidenv.composeAndroidPackages {
              buildToolsVersions = [ buildToolsVersion ];
              platformVersions = [ "33" ];
              abiVersions = [ "x86_64" ];
              includeEmulator = true;
              includeNDK = true;
              ndkVersions = [ ndkVersion ];
              includeSystemImages = true;
              systemImageTypes = [ "google_apis" ];
              useGoogleAPIs = true;
            };
            androidSdk = androidComposition.androidsdk;
          in {
            devShells.default = pkgs.mkShell {
              ANDROID_SDK_ROOT = "${androidSdk}/libexec/android-sdk";
              ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
              ANDROID_NDK_ROOT = "${androidSdk}/libexec/android-sdk/ndk/${ndkVersion}";
              NDK_HOME = "${androidSdk}/libexec/android-sdk/ndk/${ndkVersion}";

              inputsFrom = [ inputs'.holochain-flake.devShells.holonix ];
              packages = (with pkgs; [
                nodejs-18_x
                # more packages go here
                cargo-nextest
              ])
              ++ ([
                rust
              ])
              ;
              
              buildInputs = (with pkgs; [
                openssl
                # this is required for glib-networking
                glib
                jdk17
                bzip2
              ])
              ++ [ androidSdk ]
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
                makeWrapper
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
                echo "no" | avdmanager -s create avd -n Pixel -k "system-images;android-33;google_apis;x86_64" --force
              '';
            };
          };
      };
}
