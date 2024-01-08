import { resolve } from 'path'

import { configure } from '../../../vite.config'

export default configure(
  'NeighbourhoodsTestingUtils',
  resolve(__dirname, 'src/index.ts'),
)
