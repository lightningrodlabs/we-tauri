import { css, CSSResult, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { NHButton, NHCard, NHComponentShoelace } from '@neighbourhoods/design-system-components';
import { contextProvided } from '@lit-labs/context';
import { ProfilesStore, profilesStoreContext } from '@holochain-open-dev/profiles';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { SlInput } from '@scoped-elements/shoelace';

@customElement('nh-create-profile')
export class NHCreateProfile extends NHComponentShoelace {
  @contextProvided({ context: profilesStoreContext, subscribe: true })
  _profilesStore!: ProfilesStore;

  _myProfile = new StoreSubscriber(
    this,
    () => this._profilesStore.myProfile,
    () => [],
  );

  @property()
  nicknameValue!: string;
  @property()
  onChangeValue!: (e: CustomEvent) => void;
  
  /** Private properties */
  async createProfile(profile) {
    try {
      await this._profilesStore.client.createProfile(profile);
      this.dispatchEvent(
        new CustomEvent('profile-created', {
          detail: {
            profile,
          },
          bubbles: true,
          composed: true,
        }),
      );
      await this._profilesStore.myProfile.reload();
    } catch (e) {
      console.error(e);
      // notifyError(msg("Error creating the profile"));
    }
  }
  render() {
    return html`
      <nh-card .theme=${'light'} .textSize=${"md"} .hasPrimaryAction=${true} .title=${'Create Profile'} .footerAlign=${"r"}>
        <div class="content">
          <sl-input required @sl-input=${(e: CustomEvent) => this.onChangeValue(e)} value=${this.nicknameValue} filled placeholder=${"Enter a name"}></sl-input>
        </div>
        <div slot="footer">
        <nh-button
          .label=${"Create Profile"} 
          .size=${"stretch"}
          .variant=${"neutral"}
          .clickHandler=${() => {}}
          ?disabled=${false}>
        </nh-button>
        </div>
      </nh-card>
      <edit-profile
        .saveProfileLabel=${'Create Profile'}
        .store=${this._profilesStore}
        @save-profile=${e => this.createProfile(e.detail.profile)}
      ></edit-profile>
    `;
  }

  static get elementDefinitions() {
    return {
      'nh-card': NHCard,
      'nh-button': NHButton,
      'sl-input': SlInput,
    };
  }

  static styles: CSSResult[] = [
    super.styles as CSSResult,
    css`
      :host, .content {
        display: flex;
        justify-content: center;
        padding: calc(1px * var(--nh-spacing-xl))
      }

      .content {
        justify-content: space-around;
        min-width: 25vw;
      }
    `,
  ];
}
