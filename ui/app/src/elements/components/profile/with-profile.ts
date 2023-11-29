import { Profile, ProfilesSignal, ProfilesStore } from '@holochain-open-dev/profiles';
import { css, CSSResult, html, PropertyValueMap } from 'lit';
import { property, state } from 'lit/decorators.js';
import { get, readable } from 'svelte/store';
import { EntryRecord } from '@holochain-open-dev/utils';
import {
  NHComponent,
  NHProfileCard,
  NHProfileIdenticon,
} from '@neighbourhoods/design-system-components';
import { contextProvided } from '@lit-labs/context';
import { AsyncStatus, StoreSubscriber } from '@holochain-open-dev/stores';
import { MatrixStore } from '../../../matrix-store';
import { matrixContext, weGroupContext } from '../../../context';
import { AgentPubKeyB64, AppSignal, DnaHash, decodeHashFromBase64, encodeHashToBase64 } from '@holochain/client';

export class WithProfile extends NHComponent {
  @contextProvided({ context: matrixContext, subscribe: true })
  @state()
  _matrixStore!: MatrixStore;

  @contextProvided({ context: weGroupContext, subscribe: true  })
  @state()
  weGroupId!: DnaHash;

  @property()
  refreshed: boolean = false;

  @property()
  agentHash!: AgentPubKeyB64;

  @property()
  component!: 'card' | 'prompt' | 'identicon';

  profilesStore;

  agentProfile = new StoreSubscriber(
    this,
    () => (this.profilesStore as ProfilesStore).profiles.get(decodeHashFromBase64(this.agentHash)),
    () => [this.agentHash, this.profilesStore, this.refreshed]
  );

  connectedCallback(): void {
      super.connectedCallback()
      this.profilesStore = get(this._matrixStore.profilesStore(this.weGroupId as DnaHash));
      this.refreshed = false;
  }

  protected updated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
      if(_changedProperties.has('weGroupId') && typeof this.weGroupId !== 'undefined') {
        this.profilesStore = get(this._matrixStore.profilesStore(this.weGroupId as DnaHash));
    }
  }

  firstUpdated() {
      this.profilesStore!.client.client.on("signal", (signal: AppSignal) => {
        console.log("received signal: ", signal)
        if (signal.zome_name !== 'profiles') return;
        const payload = signal.payload as ProfilesSignal;
        if (payload.type !== 'EntryCreated') return;
        if (payload.app_entry.type !== 'Profile') return;

        this.agentProfile.value = {status: 'complete', value: { entry: {nickname: payload.app_entry.nickname, fields: payload.app_entry.fields}}}
        if(this.agentHash && this.agentHash == encodeHashToBase64(this._matrixStore.myAgentPubKey)) {
          this.agentProfile.value = {status: 'complete', value: { entry: {nickname: payload.app_entry.nickname, fields: payload.app_entry.fields}}};
        }
        this.requestUpdate()
      })
  }

  renderAgentIdenticon(status: AsyncStatus<EntryRecord<Profile> | undefined>) {
    if(status && status.status == 'complete') {
      return html`<nh-profile-identicon
      .responsive=${true}
          .loading=${false}
          .agentAvatarSrc=${status.value?.entry.fields.avatar}
          .agentName=${status.value?.entry.nickname ||  "No Profile Found"}
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

  renderAgentCard(status: AsyncStatus<EntryRecord<Profile> | undefined>) {
    if(status && status.status == 'complete') {
      return html`<nh-profile-card
      .loading=${false}
      .agentAvatarSrc=${status.value?.entry.fields.avatar}
      .agentName=${status.value?.entry.nickname}
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
    const status = this.agentProfile.value;
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
