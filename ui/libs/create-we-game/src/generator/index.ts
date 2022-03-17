import { ScNodeType, ScDirectory } from '@source-craft/types'; 

import { gitignore } from './gitignore';
import demo from './demo';
import { packageJson } from './packageJson';
import { rollupConfigJs } from './rollupConfigJs';
import src from './src';
import { tsconfigJson } from './tsconfigJson';
import { webDevServerConfigMjs } from './webDevServerConfigMjs';  

export default ({gameName, gameNameTitleCase}: {gameName: string; gameNameTitleCase: string;}): ScDirectory => ({
  type: ScNodeType.Directory,
  children: {
  '.gitignore': gitignore(),
  'demo': demo({gameName}),
  'package.json': packageJson(),
  'rollup.config.js': rollupConfigJs(),
  'src': src({gameNameTitleCase, gameName}),
  'tsconfig.json': tsconfigJson(),
  'web-dev-server.config.mjs': webDevServerConfigMjs()
  }
})