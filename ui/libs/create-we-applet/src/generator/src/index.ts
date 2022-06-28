import { ScNodeType, ScDirectory } from '@source-craft/types'; 

import { indexTs } from './indexTs';
import { gameNameGameTs } from './gameNameGameTs';  

export default ({gameNameTitleCase, gameName}: {gameNameTitleCase: string; gameName: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  'index.ts': indexTs({gameNameTitleCase, gameName}),
  [`${gameName}-game.ts`]: gameNameGameTs({gameNameTitleCase, gameName})
  }
})