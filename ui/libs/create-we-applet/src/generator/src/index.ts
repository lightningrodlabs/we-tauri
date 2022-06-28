import { ScNodeType, ScDirectory } from '@source-craft/types'; 

import { indexTs } from './indexTs';
import { peerStatusAppletTs } from './peerStatusAppletTs';  

export default ({appletNameTitleCase, appletName}: {appletNameTitleCase: string; appletName: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  'index.ts': indexTs({appletNameTitleCase, appletName}),
  'peer-status-applet.ts': peerStatusAppletTs({appletNameTitleCase, appletName})
  }
})