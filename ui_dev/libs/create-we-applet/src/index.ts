import { writeDirectoryTree } from "@source-craft/fs";
import generate from "./generator";
import { upperFirst, camelCase, snakeCase } from "lodash-es";

console.log(`@lightningrodlabs/create-we-applet`);

if (!process.argv[2]) {
  console.log(
    "Please provide the name of the applet: npx @lightningrodlabs/create-we-applet where"
  );
  process.exit(1);
}

const appletName = process.argv[2];

let d = generate({
  appletName: snakeCase(appletName),
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

console.log(`The npm package that has been created is prepared to operate within a larger npm workspace. Follow the instructions here:

https://www.npmjs.com/package/@lightningrodlabs/create-we-applet

to integrate the scaffolded npm workspace into a larger project.`);
