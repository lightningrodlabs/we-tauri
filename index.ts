import { css, unsafeCSS } from 'lit';
// @ts-ignore
import DarkAsString from './build/dark/css/_variables.css';
// @ts-ignore
import b64fonts from './fonts.css' assert { type: 'css' };
// @ts-ignore
import b64images from './b64images.ts';
// @ts-ignore
import Dark from './build/dark/css/variables.css';

const LitCSS = css`${unsafeCSS(DarkAsString)}`

export {
  Dark, b64images, b64fonts, LitCSS
}