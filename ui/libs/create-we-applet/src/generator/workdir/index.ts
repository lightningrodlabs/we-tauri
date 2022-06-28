import { ScNodeType, ScDirectory } from '@source-craft/types'; 

import { dnaYaml } from './dnaYaml';
import { happYaml } from './happYaml';
import { webHappYaml } from './webHappYaml';  

export default ({appletName}: {appletName: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  'dna.yaml': dnaYaml({appletName}),
  'happ.yaml': happYaml({appletName}),
  'web-happ.yaml': webHappYaml({appletName})
  }
})