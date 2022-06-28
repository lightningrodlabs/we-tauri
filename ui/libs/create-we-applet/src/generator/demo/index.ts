import { ScNodeType, ScDirectory } from '@source-craft/types'; 

import { indexHtml } from './indexHtml';  

export default ({gameName}: {gameName: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  'index.html': indexHtml({gameName})
  }
})