import { Profile, ProfilesSignal, ProfilesStore } from '@holochain-open-dev/profiles';
import { css, CSSResult, html, PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  NHComponent,
  NHProfileCard,
  NHProfileIdenticon,
} from '@neighbourhoods/design-system-components';
import { contextProvided } from '@lit-labs/context';
import { AsyncStatus, get, StoreSubscriber } from '@holochain-open-dev/stores';
import { MatrixStore } from '../../../matrix-store';
import { matrixContext, weGroupContext } from '../../../context';
import { AgentPubKeyB64, AppSignal, DnaHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';

export class WithProfile extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  @state()
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext })
  @state()
  weGroupId!: DnaHash;

  @property()
  agentHash!: AgentPubKeyB64;

  @property()
  component!: 'card' | 'prompt' | 'identicon';

  _profilesStore = get(this._matrixStore.profilesStore(this.weGroupId as DnaHash));

  private _agentProfile = new StoreSubscriber(
    this,
    () => (this._profilesStore as ProfilesStore).profiles.get(decodeHashFromBase64(this.agentHash)),
    () => [this.agentHash, this._profilesStore]
  );

  firstUpdated() {
      this._profilesStore!.client.client.on("signal", (signal: AppSignal) => {
        console.log("received signal: ", signal)
        if (signal.zome_name !== 'profiles') return;
        const payload = signal.payload as ProfilesSignal;
        if (payload.type !== 'EntryCreated') return;
        if (payload.app_entry.type !== 'Profile') return;

        // TODO: reimplement if needed.

        // this._selectedNeighbourhoodProfile.value = {status: 'complete', value: {nickname: payload.app_entry.nickname, fields: payload.app_entry.fields}}
        // if(this.forAgentHash && this.forAgentHash == encodeHashToBase64(this._matrixStore.myAgentPubKey)) {
        //   this._forAgentProfile.value = {status: 'complete', value: {nickname: payload.app_entry.nickname, fields: payload.app_entry.fields}};
        // }
        // this.requestUpdate()
      })
  }

  renderAgentIdenticon(status: AsyncStatus<Profile>) {
    if(status.status == 'complete') {
      return html`<nh-profile-identicon
      .responsive=${true}
          .loading=${false}
          .agentAvatarSrc=${status.value?.fields.avatar}
          .agentName=${status.value?.nickname ||  "No Profile Found"}
          .agentHashB64=${this.agentHash}
        ></nh-profile-identicon>`
    }
    return html`<nh-profile-identicon
        .responsive=${true}
        .loading=${true}
        .agentAvatarSrc=${null}
        .agentName=${null}
        .agentHashB64=${this.agentHash}
      ></nh-profile-identicon>`
  }

  renderAgentCard(status: AsyncStatus<Profile>) {
    if(status.status == 'complete') {
      return html`<nh-profile-card
      .loading=${false}
      .agentAvatarSrc=${status.value?.fields.avatar}
      .agentName=${status.value?.nickname}
      .agentHashB64=${this.agentHash}
    ></nh-profile-card>`
    }
    return html`<nh-profile-card
        .loading=${true}
        .agentAvatarSrc=${null}
        .agentName=${null}
        .agentHashB64=${this.agentHash}
      ></nh-profile-card>`
  }

  render() {
    debugger;
    const status = this._agentProfile.value as AsyncStatus<Profile>;
    switch (this.component) {
      case 'card':
        return this.renderAgentCard(status);
      case 'identicon':
        return this.renderAgentIdenticon(status)
    }
  }

  static elementDefinitions = {
    'nh-profile-card': NHProfileCard,
    'nh-profile-identicon': NHProfileIdenticon,
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
