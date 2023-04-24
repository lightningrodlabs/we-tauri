{
  description = "Template for Holochain app development";

  inputs = {
    nixpkgs.follows = "holochain/nixpkgs";

    holochain = {
      url = "github:holochain/holochain";
      inputs.versions.url = "github:holochain/holochain?dir=versions/0_1";
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
          { config
          , pkgs
          , system
          , ...
          }: {
            devShells.default = pkgs.mkShell {
              nativeBuildInputs = with pkgs; [
                wrapGAppsHook
                perl
                pkg-config
              ];
              buildInputs = with pkgs; [
                openssl
                glib
                gtk3
                gdk-pixbuf
                webkitgtk.dev
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
              ];
              inputsFrom = [ inputs.holochain.devShells.${system}.holonix ];
              packages = [ pkgs.nodejs-18_x pkgs.cargo-nextest pkgs.cargo-tauri ];

              shellHook = ''
                export GIO_MODULE_DIR=${pkgs.glib-networking}/lib/gio/modules/
                export GIO_EXTRA_MODULES=${pkgs.glib-networking}/lib/gio/modules
                export WEBKIT_DISABLE_COMPOSITING_MODE=1
              '';
            };
          };
      };
}