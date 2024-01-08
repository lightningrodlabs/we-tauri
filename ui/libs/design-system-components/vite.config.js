import { resolve } from 'path'

import { configure } from '../../../vite.config'

export default configure(
  'NeighbourhoodsDesignSystemComponents',
  resolve(__dirname, 'src/index.ts'),
)
