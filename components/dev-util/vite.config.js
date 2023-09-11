import { resolve } from 'path'

import { configure } from '../../vite.config'

export default configure(
  'NeighbourhoodsDevUtilComponents',
  resolve(__dirname, 'src/index.ts'),
)
