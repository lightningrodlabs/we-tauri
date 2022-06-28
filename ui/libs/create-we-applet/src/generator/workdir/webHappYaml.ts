import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const webHappYaml = ({appletName}: {appletName: string;}): ScFile => ({
  type: ScNodeType.File,
  content: `---
manifest_version: "1"
name: ${appletName}-applet
ui:
  bundled: "../ui.zip"
happ_manifest:
  bundled: "./${appletName}-applet.happ"
`
});
    