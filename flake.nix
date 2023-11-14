{
  description = "Flake for Holochain app development";

  inputs = {
    nixpkgs.follows = "holochain-dev/nixpkgs";

    holochain-dev = {
      url = "github:holochain/holochain";
      inputs.versions.url = "github:holochain/holochain/?dir=versions/0_1";
      inputs.holochain.url = "github:holochain/holochain/holochain-0.1.3";
      inputs.lair.url = "github:holochain/lair/lair_keystore-v0.2.3";
    };
  };

  outputs = inputs @ { ... }:
    inputs.holochain-dev.inputs.flake-parts.lib.mkFlake
      {
        inherit inputs;
      }
      {
        systems = builtins.attrNames inputs.holochain-dev.devShells;
        perSystem =
          { config
          , pkgs
          , system
          , ...
          }: {
            devShells.default = pkgs.mkShell {
              inputsFrom = [ inputs.holochain-dev.devShells.${system}.holonix ];
              packages = with pkgs; [
                nodejs-18_x
                nodePackages.pnpm
              ];
            };
          };
      };
}
