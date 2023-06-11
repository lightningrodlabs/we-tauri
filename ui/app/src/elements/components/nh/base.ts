import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, CSSResult, html, LitElement, unsafeCSS } from "lit";

import theme from '/src/styles/css/variables.css?inline' assert { type: 'css' };
import adapter from '/src/styles/css/design-adapter.css?inline' assert { type: 'css' };
import shoelaceUIAdapter from '/src/styles/css/shoelace-adapter.css?inline' assert { type: 'css' };

export class NHComponent extends ScopedElementsMixin(LitElement) {
  static styles : CSSResult[]|CSSResult = css`
      /** Theme Properties **/
      ${unsafeCSS(theme)}
      ${unsafeCSS(adapter)}
      ${unsafeCSS(shoelaceUIAdapter)}
    `
}