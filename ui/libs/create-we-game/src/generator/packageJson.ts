import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const packageJson = (): ScFile => ({
  type: ScNodeType.File,
  content: `{
  "name": "we-game",
  "version": "0.0.1",
  "scripts": {
    "build": "rimraf dist && tsc && rollup --config rollup.config.js",
    "build:watch": "tsc -w --preserveWatchOutput",
    "start": "concurrently -k --names tsc,dev-server \\"npm run build:watch\\" \\"web-dev-server --config ./web-dev-server.config.mjs\\""
  },
  "dependencies": {
    "@holochain-open-dev/cell-client": "^0.5.3",
    "@holochain-open-dev/profiles": "^0.3.0",
    "@holochain/client": "^0.4.1",
    "@lit-labs/context": "^0.1.2",
    "@lightningrodlabs/we-game": "^0.0.3",
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
    "rimraf": "^3.0.2",
    "rollup": "^2.56.2",
    "rollup-plugin-node-builtins": "^2.1.2",
    "rollup-plugin-node-globals": "^1.4.0",
    "rollup-plugin-terser": "^7.0.2",
    "rollup-plugin-workbox": "^6.2.0",
    "tslib": "^2.3.1",
    "typescript": "^4.5.0"
  },
  "private": true
}
`
});
    