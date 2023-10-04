import { css, CSSResult, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { NHButton, NHCard, NHComponentShoelace, NHSelectAvatar } from '@neighbourhoods/design-system-components';
import { Profile, ProfilesStore, profilesStoreContext } from '@holochain-open-dev/profiles';
import { StoreSubscriber } from '@holochain-open-dev/stores';
import { SlInput, SlSpinner } from '@scoped-elements/shoelace';
import { object, string, number, date, InferType } from 'yup';
import { isDataURL } from '../helpers/functions';

export class NHCreateProfile extends NHComponentShoelace {
  @property()
  profilesStore!: ProfilesStore;

  _myProfile = new StoreSubscriber(
    this,
    () => this.profilesStore.myProfile,
    () => [],
  );

  userSchema = object({
    nickname: string().min(3, "Must be at least 3 characters").required(),
    image: string().matches(
      isDataURL.regex,
      'Must be a valid image data URI',
    ),
  });

  user: InferType<typeof this.userSchema> = { nickname: "" };

  @query("nh-button")
  btn;

  onChangeValue(e: CustomEvent) {
    const inputControl = (e.currentTarget as any);
    switch (inputControl.name) {
      case 'nickname':
        this.user.nickname = inputControl.value; 
        break;
      default:
        this.user.image = e.detail.avatar;
        break;
    }
  }

  onSubmit() {
    const root = this.renderRoot;
    this.userSchema.validate(this.user)
    .then(valid => {
      if(!valid) throw new Error("Profile data invalid");
      this.btn.loading = true; this.btn.requestUpdate("loading");
      this.createProfile(this.user)
    })
    .catch(function (err) {
      console.log("Error validating profile for field: ", err.path);
      
      const errorDOM = root.querySelectorAll("label[name=" + err.path + "]")
      if(errorDOM.length == 0) return;
      const element : any = errorDOM[0];
      element.textContent = '*';
      element.style.display = 'flex';
      const slInput : any = element.previousElementSibling;
      slInput.setCustomValidity(err.message)
      slInput.reportValidity()
    })
  }
  
  async createProfile(profile: typeof this.user) {
    try {
      const payload : Profile = {
        nickname: profile.nickname,
        fields: {
          avatar: profile.image || ''
        }
      }
      await this.profilesStore!.client.createProfile(payload);
      await this.profilesStore!.myProfile.reload();
      this.dispatchEvent(
        new CustomEvent('profile-created', {
          detail: {
            profile,
          },
          bubbles: true,
          composed: true,
        }),
        );
    } catch (e) {
      console.error(e);
    }
  }

  render() {
    return html`
      <nh-card .theme=${'dark'} .textSize=${"md"} .hasPrimaryAction=${true} .title=${'Create Profile'} .footerAlign=${"r"}>
        <div class="content">
          <nh-select-avatar
            name="image"
            style="display: flex; margin-right: calc(1px * var(--nh-spacing-xl))"
            shape=${"circle"}
            .label=${""} 
            @avatar-selected=${(e: CustomEvent) => this.onChangeValue(e)}
          ></nh-select-avatar>
          <sl-input name="nickname" required @sl-input=${(e: CustomEvent) => this.onChangeValue(e)} value=${this.user.nickname} placeholder=${"Enter a name"}></sl-input>
          <label class="error" for="nickname" name="nickname"></label>
        </div>
        <div slot="footer">
        <nh-button
          .label=${"Create Profile"} 
          .size=${"stretch"}
          .variant=${"primary"}
          .clickHandler=${() => this.onSubmit()}
          .disabled=${false}
          .loading=${false}
        >
        </nh-button>
        </div>
      </nh-card>
    `;
  }

  static get elementDefinitions() {
    return {
      'nh-card': NHCard,
      'nh-button': NHButton,
      'sl-input': SlInput,
      "nh-select-avatar": NHSelectAvatar,
      "sl-spinner": SlSpinner ,
    };
  }

  static styles: CSSResult[] = [
    ...super.styles as CSSResult[],
    css`
      :host, .content {
        display: flex;
        justify-content: center;
        padding: calc(1px * var(--nh-spacing-xl))
      }

      .content {
        justify-content: center;
        min-width: 25vw;
      }

      label {
        display: none;
        padding: 0 8px;
        flex: 1;
        flex-grow: 0;
        flex-basis: 8px;
        color: var(--nh-theme-error-default); 
      }
    `,
  ];
}
