{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    versions.url = "github:holochain/holochain?dir=versions/0_2";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "versions";
    };
  };

  outputs = inputs @ { ... }:
    inputs.holochain.inputs.flake-parts.lib.mkFlake
      {
        inherit inputs;
      }
      {
        systems = builtins.attrNames inputs.holochain.devShells;
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
            libraries = with pkgs;[
              libayatana-appindicator
              webkitgtk
              libappindicator-gtk3
              gtk3
              cairo
              gdk-pixbuf
              glib
              dbus
              openssl_3
              librsvg
            ];
          in
          {
            devShells.default = pkgs.mkShell {
              inputsFrom = [ inputs'.holochain.devShells.holonix ];
              packages = with pkgs; [
                nodejs-18_x
                cargo-nextest
                xvfb-run
              ];
              buildInputs = (with pkgs; [
                openssl

                # this is required for glib-networking
                glib
              ])
              ++ (lib.optionals pkgs.stdenv.isLinux
                (with pkgs; [
                  curl
                  wget
                  dbus
                  openssl_3
                  glib
                  libsoup
                  libappindicator-gtk3
                  librsvg
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
                export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath libraries}:$LD_LIBRARY_PATH
                export XDG_DATA_DIRS=${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS

              '';
            };
          };
      };
}
