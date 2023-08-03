import { css, CSSResult, LitElement, unsafeCSS } from 'lit';

import { Dark } from '@neighbourhoods/design-system-styles';
// import shoelaceUIAdapter from '../styles/css/dark/shoelace-adapter.css?inline' assert { type: 'css' };
// import materialUIAdapter from '../styles/css/dark/material-adapter.css?inline' assert { type: 'css' };
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';

export class NHComponent extends ScopedRegistryHost(LitElement) {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(Dark)}`];
}
export class NHComponentShoelace extends ScopedRegistryHost(LitElement) {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(Dark)}`];// , css`${unsafeCSS(shoelaceUIAdapter)}`];
}
export class NHComponentMaterial extends ScopedRegistryHost(LitElement) {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(Dark)}`]//, css`${unsafeCSS(materialUIAdapter)}`];
}