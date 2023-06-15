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
      this._hasCreatedProfile = typeof(emittedValue as any).value !== 'undefined'
      typeof(emittedValue as any).value !== 'undefined' && this.requestUpdate()
    })
  }
  render() {
    return html`
      <div>
        <slot name="info"></slot>
        ${!this._hasCreatedProfile ? html`<slot name="hero"></slot><profile-prompt></profile-prompt>` : html`<slot name="content"><slot></slot></slot>`}
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
    `,
  ];
}
