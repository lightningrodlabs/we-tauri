import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const packageJson = ({appletName}: {appletName: string;}): ScFile => ({
  type: ScNodeType.File,
  content: `{
  "name": "we-applet",
  "version": "0.0.1",
  "scripts": {
    "start": "npm run build:happ && cross-env HC_PORT=\$(port) ADMIN_PORT=\$(port) concurrently \\"npm run start:happ\\" \\"npm run start:ui\\"",
    "start:ui": "concurrently -k --names tsc,dev-server \\"npm run build:watch\\" \\"wds --config ./web-dev-server.config.mjs\\"",
    "start:happ": "RUST_LOG=warn WASM_LOG=debug hc s -f=\$ADMIN_PORT generate ./workdir/${appletName}-applet.happ --run=\$HC_PORT -a ${appletName}-applet network mdns",
    "build": "rimraf dist && tsc && rollup --config rollup.config.js",
    "build:watch": "tsc -w --preserveWatchOutput",
    "package": "npm run build:happ && npm run package:ui && hc web-app pack ./workdir",
    "package:ui": "rimraf ui.zip && npm run build && cd ./dist && bestzip ../ui.zip * ",
    "build:happ": "npm run build:dnas && hc app pack ./workdir",
    "build:dnas": "npm run build:zomes && hc dna pack ./workdir",
    "build:zomes": "CARGO_TARGET_DIR=target cargo build --release --target wasm32-unknown-unknown"
  },
  "dependencies": {
    "@holochain-open-dev/profiles": "^0.4.1",
    "@holochain/client": "^0.6.0",
    "@lightningrodlabs/we-applet": "^0.0.1",
    "@lit-labs/context": "^0.1.2",
    "@open-wc/scoped-elements": "^2.0.1",
    "@scoped-elements/material-web": "^0.0.19",
    "lit": "^2.2.0"
  },
  "devDependencies": {
    "@babel/preset-env": "^7.15.0",
    "@rollup/plugin-babel": "^5.3.0",
    "@rollup/plugin-commonjs": "18.0.0",
    "@rollup/plugin-node-resolve": "^13.0.4",
    "@rollup/plugin-replace": "^3.0.0",
    "@web/dev-server": "^0.1.21",
    "@web/dev-server-rollup": "^0.3.10",
    "@web/rollup-plugin-import-meta-assets": "^1.0.7",
    "babel-plugin-template-html-minifier": "^4.1.0",
    "bestzip": "^2.2.0",
    "concurrently": "^5.3.0",
    "deepmerge": "^4.2.2",
    "new-port-cli": "^1.0.0",
    "rimraf": "^3.0.2",
    "rollup": "^2.56.2",
    "rollup-plugin-copy": "^3.4.0",
    "rollup-plugin-terser": "^7.0.2",
    "rollup-plugin-workbox": "^6.2.0",
    "tslib": "^2.3.1",
    "typescript": "^4.5.0"
  },
  "private": true
}
`
});
