import fs from "fs";
import {
  readFolder,
  directoryToGenerator,
  writeDirectoryTree,
} from "@source-craft/fs";
import { fileURLToPath } from "url";
import path from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const d = readFolder(`${__dirname}/template`);

const patched = directoryToGenerator(d, [
  {
    literal: "Profiles",
    template: "appletNameTitleCase",
  },
  {
    literal: "profiles",
    template: "appletName",
  },
]);

if (!fs.existsSync("./src")) fs.mkdirSync("./src");

writeDirectoryTree(`${__dirname}/src/generator`, patched);
