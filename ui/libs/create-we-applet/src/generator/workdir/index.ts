import { ScNodeType, ScDirectory } from '@source-craft/types'; 

import { dnaYaml } from './dnaYaml';
import { happYaml } from './happYaml';
import { appletNameAppletHapp } from './appletNameAppletHapp';
import { appletNameDna } from './appletNameDna';
import { webHappYaml } from './webHappYaml';  

export default ({appletName}: {appletName: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  'dna.yaml': dnaYaml({appletName}),
  'happ.yaml': happYaml({appletName}),
  [`${appletName}-applet.happ`]: appletNameAppletHapp(),
  [`${appletName}.dna`]: appletNameDna(),
  'web-happ.yaml': webHappYaml({appletName})
  }
})