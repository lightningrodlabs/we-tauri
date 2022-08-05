import { fromRollup } from '@web/dev-server-rollup';
import rollupCommonjs from '@rollup/plugin-commonjs';
import rollupGlobals from 'rollup-plugin-node-globals';
import rollupBuiltins from 'rollup-plugin-node-builtins';
import rollupReplace from '@rollup/plugin-replace';

const builtins = fromRollup(rollupBuiltins);
const replace = fromRollup(rollupReplace);
const commonjs = fromRollup(rollupCommonjs);
const globals = fromRollup(rollupGlobals);

export default [
  replace({
    'process.env.PORT': process.env.PORT,
  }),
];
