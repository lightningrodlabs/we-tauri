import { css, CSSResult, LitElement, unsafeCSS } from 'lit';

import { Dark, LitCSS, Shoelace } from '@neighbourhoods/design-system-styles';
// import materialUIAdapter from '../styles/css/dark/material-adapter.css?inline' assert { type: 'css' };
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';

export class NHComponent extends ScopedRegistryHost(LitElement) {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(Dark)}`];
}
export class NHComponentShoelace extends NHComponent {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(LitCSS)}`, css`${unsafeCSS(Shoelace)}`];
}
export class NHComponentMaterial extends ScopedRegistryHost(LitElement) {
  static styles: CSSResult|CSSResult[] = [css`${unsafeCSS(Dark)}`]//, css`${unsafeCSS(materialUIAdapter)}`];
}