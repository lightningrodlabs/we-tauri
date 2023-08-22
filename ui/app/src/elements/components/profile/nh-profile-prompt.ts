import { css, CSSResult, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { NHComponentShoelace } from '@neighbourhoods/design-system-components';
import { NHCreateProfile } from './nh-create-profile';

@customElement('nh-profile-prompt')
export class NHProfilePrompt extends NHComponentShoelace {
  @property()
  profilesStore;

  render() {
    return html`<div
      class="column"
      style="align-items: center; justify-content: center; flex: 1; padding-bottom: 10px;"
        >
        <div class="column" style="align-items: center;">
          <nh-create-profile .profilesStore=${this.profilesStore}></nh-create-profile>
        </div>
      </div>`
}

  static get elementDefinitions() {
    return {
      "nh-create-profile": NHCreateProfile,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        flex: 1;
        height: 100vh
        display:flex;
        flex-direction: column;
      }
      slot[name="content"]::slotted(*) {
        position: absolute;
        top: 72px;
        left: 72px;
        height: calc(100vh - 72px);
        width: calc(100vw - 72px);
        display: flex;
      }
      #prompt {
        --sl-color-primary-500: var(--nh-theme-bg-surface);
        
        --sl-color-primary-600: var(--nh-theme-bg-muted);
        --sl-color-neutral-500: var(--nh-theme-bg-surface);
        --sl-color-neutral-1000: var(--nh-theme-fg-on-dark);
        --sl-color-primary-1000: var(--nh-theme-fg-on-dark);
        --sl-panel-background-color: var(--nh-theme-bg-surface);

        --sl-spacing-3x-small: calc(1px * var(--nh-spacing-md));
        --sl-input-height-medium:  calc(1rem * var(--nh-spacing-xs));
        --sl-input-height-large:  4rem;
        --sl-input-border-width: 2px;
        --sl-input-color: var(--nh-theme-fg-on-dark);
        --sl-input-border-color: transparent;
        --sl-input-background-color: var(--nh-theme-bg-surface);
        --sl-input-font-size-medium: calc(1px * var(--nh-font-size-lg));
        --sl-input-label-font-size-medium: calc(1px * var(--nh-font-size-xl));

        --sl-spacing-large: calc(1px * var(--nh-spacing-xl));
        --sl-border-radius-medium: calc(1px * var(--nh-radii-lg));
      }
    `,
  ];
}
