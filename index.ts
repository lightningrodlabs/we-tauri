// @ts-ignore
import DarkAsString from './build/dark/css/_variables.css';
import { css, unsafeCSS } from 'lit';
// @ts-ignore
import Dark from './build/dark/css/variables.css';

const LitCSS = css`${unsafeCSS(DarkAsString)}`

export {
  Dark, LitCSS
}