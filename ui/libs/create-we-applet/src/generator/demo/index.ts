import { ScNodeType, ScDirectory } from '@source-craft/types'; 

import { indexHtml } from './indexHtml';

export default ({appletName}: {appletName: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  'index.html': indexHtml({appletName})
  }
})