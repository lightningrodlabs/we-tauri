import { ScNodeType, ScDirectory } from '@source-craft/types'; 

import { indexHtml } from './indexHtml';  

export default ({appletNameTitleCase, appletName}: {appletNameTitleCase: string; appletName: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  'index.html': indexHtml({appletNameTitleCase, appletName})
  }
})