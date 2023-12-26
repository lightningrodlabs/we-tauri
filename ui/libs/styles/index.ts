import { CSSResult, css, unsafeCSS } from 'lit';

// @ts-ignore
import Shoelace from './shoelace-adapter.css';
// @ts-ignore
import b64fonts from './fonts.css';
// @ts-ignore
import b64images from './b64images.ts';
// @ts-ignore
import Dark from './build/dark/css/variables.css';

const LitCSS: CSSResult = css`${unsafeCSS(Dark)}`

export {
  Dark, b64images, b64fonts, LitCSS, Shoelace
}