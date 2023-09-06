import { Profile, ProfilesSignal } from '@holochain-open-dev/profiles';
import { css, CSSResult, html, PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  NHComponent,
  NHProfileCard,
  NHProfileIdenticon,
} from '@neighbourhoods/design-system-components';
import { contextProvided } from '@lit-labs/context';
import { AsyncReadable, deriveStore, get, StoreSubscriber } from '@holochain-open-dev/stores';
import { MatrixStore } from '../../../matrix-store';
import { matrixContext, weGroupContext } from '../../../context';
import { AgentPubKeyB64, AppSignal, DnaHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';
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
  forAgentHash!: AgentPubKeyB64;

  @state()
  forAgentProfile!: Profile;

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

  _forAgentProfile = new StoreSubscriber(
    this,
    () => this._profilesStore.value?.profiles.get(this.forAgentHash ? decodeHashFromBase64(this.forAgentHash) : this._matrixStore.myAgentPubKey) as AsyncReadable<Profile>,
    () => [this.forAgentHash],
  );

  firstUpdated() {
      this._profilesStore.value?.client.client.on("signal", (signal: AppSignal) => {
        console.log("received signal: ", signal)
        if (signal.zome_name !== 'profiles') return; 
        const payload = signal.payload as ProfilesSignal;
        if (payload.type !== 'EntryCreated') return;
        if (payload.app_entry.type !== 'Profile') return;
        this._selectedNeighbourhoodProfile.value = {status: 'complete', value: {nickname: payload.app_entry.nickname, fields: payload.app_entry.fields}}
        if(this.forAgentHash && this.forAgentHash == encodeHashToBase64(this._matrixStore.myAgentPubKey)) {
          this._forAgentProfile.value = {status: 'complete', value: {nickname: payload.app_entry.nickname, fields: payload.app_entry.fields}};
        }
        this.requestUpdate()
      })
  }

  renderAgentIdenticon() {
    if(!this._forAgentProfile?.value) return html``
    const {status, value} : any = this._forAgentProfile.value;
    return html`<nh-profile-identicon
        .responsive=${true}
        .loading=${status != 'complete'}
        .agentAvatarSrc=${status == 'complete' ? value?.fields.avatar : null}
        .agentName=${status == 'complete' ? (value?.nickname ||  "No Profile Found") : null}
        .agentHashB64=${this.forAgentHash}
      ></nh-profile-identicon>`
  }

  renderAgentCard() { 
    const {status, value} : any = (this.forAgentHash ? this._forAgentProfile : this._selectedNeighbourhoodProfile).value;
    return html`<nh-profile-card
        .loading=${status != 'complete'}
        .agentAvatarSrc=${status == 'complete' ? value?.fields.avatar : null}
        .agentName=${status == 'complete' && value?.nickname || "No Profile Found"}
        .agentHashB64=${this.forAgentHash || encodeHashToBase64(this._matrixStore.myAgentPubKey)}
      ></nh-profile-card>`
  }

  render() {
    this.refreshed = false;
    switch (true) {
      case this.component == 'card':
        return this.renderAgentCard();
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
        return this.renderAgentIdenticon()
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
