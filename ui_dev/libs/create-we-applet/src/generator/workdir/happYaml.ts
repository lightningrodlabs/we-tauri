import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const happYaml = ({appletName}: {appletName: string;}): ScFile => ({
  type: ScNodeType.File,
  content: `---
manifest_version: "1"
name: ${appletName}-applet
description: ~
roles:
  - id: ${appletName}
    provisioning:
      strategy: create
      deferred: false
    dna:
      bundled: "./${appletName}.dna"
      properties: ~
      uuid: ~
      version: ~
      clone_limit: 100`
});
    