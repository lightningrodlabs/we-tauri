import { NHComponent } from "@neighbourhoods/design-system-components";
import { css, html } from "lit";
import { property } from "lit/decorators.js";
import { NHCreateProfile } from "./profile/nh-create-profile";
import { ProfilesStore } from "@holochain-open-dev/profiles";
import { NeighbourhoodInfo } from "@neighbourhoods/nh-launcher-applet";

export class ProfilePrompt extends NHComponent {
  @property()
  neighbourhoodInfo!: NeighbourhoodInfo;

  @property()
  profilesStore!: ProfilesStore;
  
  render() {
    return html`
              <div class="container">
                <div slot="hero" class="hero">
                  <img
                    src=${this.neighbourhoodInfo.logoSrc!}
                  />
                  <h1>${this.neighbourhoodInfo.name}</h1>
                  <h2>How would you like to appear in this neighbourhood?</h2>
                </div>
                <nh-create-profile .profilesStore=${this.profilesStore}></nh-create-profile>
              </div>
    `;
  }

  static elementDefinitions = {
      'nh-create-profile': NHCreateProfile,
  }

  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex: 1;
          justify-content: center;
          align-items: flex-start;
        }

        .container {
          margin-top: calc(1px * var(--nh-spacing-xl));
          padding: calc(1px * var(--nh-spacing-lg));
          align-items: center;
          justify-content: center;
          display: flex;
          flex-direction: column;
          flex: 1
          padding-bottom: calc(1px * var(--nh-spacing-sm));
        }

        .hero {
          color: var(--nh-theme-fg-default);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }

        h1 {
          font-weight: bold;
          margin-top: 20px;
          font-size: 1.2em;
        }

        h2 {
          margin: calc(1px * var(--nh-spacing-md));
          margin-top: calc(1px * var(--nh-spacing-sm));
          font-size: calc(1px * var(--nh-font-size-lg));
        }

        img {
          max-width: 20rem;
          border-radius: 100%;
        }
      `,
    ];
  }
}