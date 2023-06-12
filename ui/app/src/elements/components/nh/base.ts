import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { css, CSSResult, LitElement, unsafeCSS } from 'lit';

import theme from '/src/styles/css/variables.css?inline' assert { type: 'css' };
import tempAdapter from '/src/styles/css/design-adapter.css?inline' assert { type: 'css' };
import shoelaceUIAdapter from '/src/styles/css/shoelace-adapter.css?inline' assert { type: 'css' };
import materialUIAdapter from '/src/styles/css/material-adapter.css?inline' assert { type: 'css' };

export class NHComponent extends ScopedElementsMixin(LitElement) {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(theme)}`, css`${unsafeCSS(tempAdapter)}`];
}
export class NHComponentShoelace extends ScopedElementsMixin(LitElement) {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(theme)}`, css`${unsafeCSS(tempAdapter)}` , css`${unsafeCSS(shoelaceUIAdapter)}`];
}
export class NHComponentMaterial extends ScopedElementsMixin(LitElement) {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(materialUIAdapter)}`];
}