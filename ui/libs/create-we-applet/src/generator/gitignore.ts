import { ScFile, ScNodeType } from '@source-craft/types';

export const gitignore = (): ScFile => ({
  type: ScNodeType.File,
  content: `dist
out-tsc
node_modules
*.tsbuildinfo
*.happ
*.dna
ui.zip
target`
});
    