# Example: Custom Holochain And Binaries
#
# The following `shell.nix` file can be used in your project's root folder and activated with `nix-shell`.
# It uses a custom revision and a custom set of binaries to be installed.

{
  holonixPath ?  builtins.fetchTarball { url = "https://github.com/holochain/holonix/archive/develop.tar.gz"; }
}:

let
  holonix = import (holonixPath) {
    include = {
        # making this explicit even though it's the default
        holochainBinaries = true;
    };

    holochainVersionId = "custom";

    holochainVersion = {
      rev = "fd95fa8e967077b7c27b570ace92dec33261a9c2";
      sha256 = "sha256:1jr8rfw121vbwdh6nnpgqp5zk1rxzy29xazi39n43jqn0c8jkwmj";
      cargoSha256 = "sha256:1i8sgf1pamjzlx9p62dm81b795z8gvgcd51w42ivxwfp8jq95qrx";
      bins = {
        holochain = "holochain";
        hc = "hc";
      };

      lairKeystoreHashes = {
        sha256 = "0khg5w5fgdp1sg22vqyzsb2ri7znbxiwl7vr2zx6bwn744wy2cyv";
        cargoSha256 = "1lm8vrxh7fw7gcir9lq85frfd0rdcca9p7883nikjfbn21ac4sn4";
      };
    };
  };
  nixpkgs = holonix.pkgs;
in nixpkgs.mkShell {
  inputsFrom = [ holonix.main ];
  buildInputs = with nixpkgs; [
    binaryen
    nodejs-16_x
  ];
}
