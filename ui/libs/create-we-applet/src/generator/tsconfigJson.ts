import { ScFile, ScNodeType } from '@source-craft/types';

export const tsconfigJson = (): ScFile => ({
  type: ScNodeType.File,
  content: `{
  "compilerOptions": {
    "target": "es2018",
    "module": "esnext",
    "moduleResolution": "node",
    "noEmitOnError": true,
    "lib": ["es2017", "dom"],
    "strict": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "sourceMap": true,
    "inlineSources": true,
    "incremental": true,
    "outDir": "out-tsc",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*.ts"]
}
`
});
    