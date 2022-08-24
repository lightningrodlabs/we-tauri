import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const dnaYaml = ({appletName}: {appletName: string;}): ScFile => ({
  type: ScNodeType.File,
  content: `---
manifest_version: "1"
name: ${appletName}
integrity:
network_seed: 00000000-0000-0000-0000-000000000000
  properties: ~
  zomes:
    - name: ${appletName}_integrity
      bundled: ../target/wasm32-unknown-unknown/release/${appletName}_integrity.wasm
coordinator:
  zomes:
    - name: ${appletName}
      bundled: ../target/wasm32-unknown-unknown/release/${appletName}.wasm
      dependencies:
        - name: ${appletName}_integrity
`
});
