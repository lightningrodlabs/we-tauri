import { css, CSSResult, html, PropertyValueMap } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { NHButton, NHCard, NHComponent, NHComponentShoelace, NHProfileCard } from '@neighbourhoods/design-system-components';
import { contextProvided } from '@lit-labs/context';
import { get, StoreSubscriber } from '@holochain-open-dev/stores';
import { MatrixStore } from '../../../matrix-store';
import { matrixContext } from '../../../context';
import { DnaHash, encodeHashToBase64 } from '@holochain/client';
import { NHProfilePrompt } from './nh-profile-prompt';
import { Profile } from '@holochain-open-dev/profiles';

@customElement('with-profile')
export class WithProfile extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  @state()
  _matrixStore!: MatrixStore;

  @property()
  weGroupId: DnaHash | undefined; 

  @property()
  component!: "card" | "prompt" | "identicon" ;

  @state()
  refreshed: boolean = false;

  _profilesStore = new StoreSubscriber(this, () => this._matrixStore?.profilesStore(this.weGroupId as DnaHash));

  _selectedNeighbourhoodProfile = new StoreSubscriber(this, () => this._profilesStore.value!.myProfile, () => [this.refreshed]);

  render() {
    this.refreshed = false;
    switch (true) {
      case this.component == "card":
        return this._selectedNeighbourhoodProfile.value.status != "complete" 
          ? html`<div style="width: 4rem; height: 4rem; background: pink">LOADING PLACEHOLDER</div>` 
          : html`<slot><nh-profile-card
                        .agentAvatarSrc=${(this._selectedNeighbourhoodProfile.value as any).value?.fields?.avatar} 
                        .agentName=${(this._selectedNeighbourhoodProfile.value as any).value.nickname} 
                        .agentHashB64=${encodeHashToBase64(this._matrixStore.myAgentPubKey)}>
                      </nh-profile-card>
                </slot>`;
      case this.component == "prompt":
        return (get((this._profilesStore.value as any).myProfile) as any).value
          ? html`<slot name="content"></slot>`
          : html`<slot name="hero" slot="hero"></slot> <slot name="info" slot="info"></slot>
                  <nh-profile-prompt .profilesStore=${this._profilesStore} @profile-created=${async () => { await this._profilesStore.value!.myProfile.reload(); this.refreshed = true;}}></nh-profile-prompt>`;
        default:
        break;
    }
  }

  static get elementDefinitions() {
    return {
      'nh-profile-card': NHProfileCard,
      'nh-profile-prompt': NHProfilePrompt,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host {
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: 0%;
        flex-direction: column;
      }
    `,
  ]
  
}
