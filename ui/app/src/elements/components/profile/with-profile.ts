import { css, CSSResult, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  NHComponent,
  NHProfileCard,
  NHProfileIdenticon,
} from '@neighbourhoods/design-system-components';
import { contextProvided } from '@lit-labs/context';
import { deriveStore, get, StoreSubscriber } from '@holochain-open-dev/stores';
import { MatrixStore } from '../../../matrix-store';
import { matrixContext, weGroupContext } from '../../../context';
import { AgentPubKeyB64, DnaHash, encodeHashToBase64 } from '@holochain/client';
import { NHProfilePrompt } from './nh-profile-prompt';

@customElement('with-profile')
export class WithProfile extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  @state()
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext })
  @state()
  weGroupId!: DnaHash;

  @property()
  forAgentHash: AgentPubKeyB64 | undefined;

  @property()
  component!: 'card' | 'prompt' | 'identicon';

  @state()
  refreshed: boolean = false;

  _profilesStore = new StoreSubscriber(this, () =>
    this._matrixStore?.profilesStore(this.weGroupId as DnaHash),
  );

  _selectedNeighbourhoodProfile = new StoreSubscriber(
    this,
    () =>
      deriveStore(
        this._matrixStore.profilesStore(this.weGroupId as DnaHash),
        store => store!.myProfile,
      ),
    () => [this.refreshed],
  );

  render() {
    this.refreshed = false;
    switch (true) {
      case this.component == 'card':
        return this._selectedNeighbourhoodProfile.value.status != 'complete'
          ? html`<slot
              ><nh-profile-card
                .loading=${true}
                .agentHashB64=${encodeHashToBase64(this._matrixStore.myAgentPubKey)}
              >
              </nh-profile-card>
            </slot>`
          : html`<slot
              ><nh-profile-card
                .agentAvatarSrc=${(this._selectedNeighbourhoodProfile.value as any).value?.fields
                  ?.avatar}
                .agentName=${(this._selectedNeighbourhoodProfile.value as any).value?.nickname ||
                'No Profile Created'}
                .agentHashB64=${encodeHashToBase64(this._matrixStore.myAgentPubKey)}
              >
              </nh-profile-card>
            </slot>`;
      case this.component == 'prompt':
        return (get((this._profilesStore.value as any).myProfile) as any).value
          ? html`<slot name="content"></slot>`
          : html`<slot name="hero" slot="hero"></slot><slot name="info" slot="info"></slot>
              <nh-profile-prompt
                .profilesStore=${this._profilesStore}
                @profile-created=${async () => {
                  await this._profilesStore.value!.myProfile.reload();
                  this.refreshed = true;
                }}
              ></nh-profile-prompt>`;
      case this.component == 'identicon':
        return html`<nh-profile-identicon
          .agentAvatarSrc=${typeof this.forAgentHash !== 'undefined' ? "none" :(this._selectedNeighbourhoodProfile.value as any).value?.fields?.avatar}
          .agentName=${typeof this.forAgentHash !== 'undefined' ? "agent" : ((this._selectedNeighbourhoodProfile.value as any).value?.nickname ||
          'No Profile Created')}
          .agentHashB64=${typeof this.forAgentHash !== 'undefined' ? this.forAgentHash : encodeHashToBase64(this._matrixStore.myAgentPubKey)}
        ></nh-profile-identicon>`;
    }
  }

  static get elementDefinitions() {
    return {
      'nh-profile-card': NHProfileCard,
      'nh-profile-prompt': NHProfilePrompt,
      'nh-profile-identicon': NHProfileIdenticon,
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
  ];
}
