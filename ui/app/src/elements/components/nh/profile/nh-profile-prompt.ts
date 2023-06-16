import { css, CSSResult, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { NHComponentShoelace } from 'neighbourhoods-design-system-components';
import '@holochain-open-dev/profiles/dist/elements/profile-prompt.js';
import { contextProvided } from '@lit-labs/context';
import { ProfilesStore, profilesStoreContext } from '@holochain-open-dev/profiles';

@customElement('nh-profile-prompt')
export class NHProfilePrompt extends NHComponentShoelace {
  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  @state({})
  private _hasCreatedProfile: boolean = false;

  connectedCallback(): void {
    super.connectedCallback();
    this._profilesStore.myProfile.subscribe(emittedValue => {
      this._hasCreatedProfile = typeof (emittedValue as any).value !== 'undefined';
      typeof (emittedValue as any).value !== 'undefined' && this.requestUpdate();
    });
  }
  render() {
    return html`
      <div>
        <slot name="info"></slot>
        ${!this._hasCreatedProfile
          ? html`<slot name="hero"></slot><profile-prompt id="prompt"></profile-prompt>`
          : html`<slot name="content"><slot></slot></slot>`}
      </div>
    `;
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
        --sl-color-primary-500: var(--nh-theme-bg-subtle);
        
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
        --sl-input-background-color: var(--nh-theme-bg-subtle);
        --sl-input-font-size-medium: calc(1px * var(--nh-font-size-lg));
        --sl-input-label-font-size-medium: calc(1px * var(--nh-font-size-xl));

        --sl-spacing-large: calc(1px * var(--nh-spacing-xl));
        --sl-border-radius-medium: calc(1px * var(--nh-radii-lg));
      }
      #name-field::part(base) {
        border: none;
        background-color: var(--nh-theme-bg-subtle);
        padding: calc(1px * var(--nh-spacing-md)) calc(1px * var(--nh-spacing-md));
        height: calc(1rem * var(--nh-spacing-xs));
      }
      #name-field::part(input) {
        color: var(--nh-theme-fg-default);
        height: auto !important;
        font-weight: 500;
      }
      #name-field::part(input)::placeholder {
        color: var(--nh-theme-input-placeholder);
        opacity: 1;
      }
    `,
  ];
}
