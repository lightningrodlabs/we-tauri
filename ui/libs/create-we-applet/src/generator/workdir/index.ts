import { ScNodeType, ScDirectory } from '@source-craft/types'; 

import { dnaYaml } from './dnaYaml';
import { happYaml } from './happYaml';
import { appletNameAppletHapp } from './appletNameAppletHapp';
import { appletNameAppletWebhapp } from './appletNameAppletWebhapp';
import { appletNameDna } from './appletNameDna';
import { profilesAppletHapp } from './profilesAppletHapp';
import { profilesDna } from './profilesDna';
import { webHappYaml } from './webHappYaml';  

export default ({appletName}: {appletName: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  'dna.yaml': dnaYaml({appletName}),
  'happ.yaml': happYaml({appletName}),
  [`${appletName}-applet.happ`]: appletNameAppletHapp(),
  [`${appletName}-applet.webhapp`]: appletNameAppletWebhapp(),
  [`${appletName}.dna`]: appletNameDna(),
  'profiles-applet.happ': profilesAppletHapp(),
  'profiles.dna': profilesDna(),
  'web-happ.yaml': webHappYaml({appletName})
  }
})