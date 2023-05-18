import { execSync } from "child_process";
import fs from "fs";

let triplet = execSync("rustc -vV | awk '/^host/ { print $2 }'").toString();
triplet = triplet.slice(0, triplet.length - 1);

const binsPath = `src-tauri/bins`;

const targetPath = `${binsPath}/lair-keystore-${triplet}`;

if (!fs.existsSync(targetPath)) {
  if (!fs.existsSync(binsPath)) {
    fs.mkdirSync(binsPath);
  }

  let lairLocation = execSync("which lair-keystore").toString();
  lairLocation = lairLocation.slice(0, lairLocation.length - 1);

  fs.copyFileSync(lairLocation, targetPath);
}
