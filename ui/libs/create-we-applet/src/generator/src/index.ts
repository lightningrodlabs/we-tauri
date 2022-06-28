import { ScNodeType, ScDirectory } from '@source-craft/types';

import { indexTs } from './indexTs';
import { appletNameAppletTs } from './appletNameAppletTs';

export default ({appletNameTitleCase, appletName}: {appletNameTitleCase: string; appletName: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  'index.ts': indexTs({appletNameTitleCase, appletName}),
  [`${appletName}-applet.ts`]: appletNameAppletTs({appletNameTitleCase, appletName})
  }
})