// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import semver from "semver";
import chalk from "chalk";
import { writeDirectoryTree } from "@source-craft/fs";
import generate from "./generator";
import { upperFirst, camelCase } from "lodash-es";

console.log(`@lightningrodlabs/create-we-applet`);

if (!semver.gte(process.version, "14.0.0")) {
  console.log(
    chalk.bgRed("\nUh oh! Looks like you dont have Node v14 installed!\n")
  );
  console.log(`You can do this by going to ${chalk.underline.blue(
    `https://nodejs.org/`
  )}
  Or if you use nvm:
    $ nvm install node ${chalk.gray(
      `# "node" is an alias for the latest version`
    )}
    $ nvm use node
  `);
  process.exit(1);
}

if (!process.argv[2]) {
  console.log(
    "Please provide the name of the applet: npx @lightningrodlabs/create-we-applet where"
  );
  process.exit(1);
}

const appletName = process.argv[2];

let d = generate({
  appletName,
  appletNameTitleCase: upperFirst(camelCase(appletName)),
});

writeDirectoryTree(`${process.cwd()}/we-applet`, d);

console.log(`Applet scaffolded!\n`);
console.log(`Run these commands to get started:\n`);

console.log(`cd we-applet`);
console.log(`npm install`);
console.log(`npm run start\n`);


console.log(`Or if you want to package it into its own .webhapp:\n`);

console.log(`npm run package\n`);

console.log(`The npm package that has been created is prepared to operate within a larger npm workspace. Follow the instructions in the README of this package to get integrate the scaffolded npm workspace into a larger project.`);
