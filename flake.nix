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
              ];
              inputsFrom = [ inputs.holochain.devShells.${system}.holonix ];
              packages = [ pkgs.nodejs-18_x pkgs.cargo-nextest pkgs.cargo-tauri ];

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