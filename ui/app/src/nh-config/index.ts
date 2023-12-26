import NHGlobalConfig from './nh-global-config'
import NHDimensionConfig from './pages/nh-dimensions-config'
import CreateDimension from './create-input-dimension-form'
import CreateOutputDimensionMethod from './create-output-dimension-form'
import DimensionList from './dimension-list'

export const MIN_RANGE_INT = 0;
export const MAX_RANGE_INT = 4294967295;
export const MIN_RANGE_FLOAT = -Number.MAX_SAFE_INTEGER;
export const MAX_RANGE_FLOAT = Number.MAX_SAFE_INTEGER;

export const DEFAULT_RANGE_MIN = 0;

export { NHGlobalConfig, NHDimensionConfig,CreateOutputDimensionMethod, CreateDimension, DimensionList }