import { ScFile, ScNodeType } from '@source-craft/types';

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
    