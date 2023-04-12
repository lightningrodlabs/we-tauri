import { html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { DnaHash } from "@holochain/client";

import "@holochain-open-dev/profiles/dist/elements/profiles-context.js";
import "@holochain-open-dev/profiles/dist/elements/create-profile.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import { localized, msg } from "@lit/localize";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import { Profile } from "@holochain-open-dev/profiles";
import { consume } from "@lit-labs/context";
import { WeStore } from "../../we-store";
import { weStoreContext } from "../../context";
import { toPromise } from "../../utils";
import { weStyles } from "../../shared-styles";

@localized()
@customElement("create-profile-in-group")
export class CreateProfileInGroup extends LitElement {
  @consume({ context: weStoreContext, subscribe: true })
  weStore!: WeStore;

  @property()
  groupDnaHash!: DnaHash;

  @query("sl-dialog")
  dialog!: SlDialog;

  show() {
    this.dialog.show();
  }

  hide() {
    this.dialog.hide();
  }

  async createProfile(profile: Profile) {
    const groupStore = await toPromise(
      this.weStore.groups.get(this.groupDnaHash)
    );
    await groupStore.profilesStore.client.createProfile(profile);

    this.dispatchEvent(
      new CustomEvent("profile-created", {
        detail: {
          profile,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <sl-dialog .label=${msg("Create Profile For This Group")}>
        ${this.groupDnaHash
          ? html`
              <group-context .groupDnaHash=${this.groupDnaHash}>
                <edit-profile
                  .saveProfileLabel=${msg("Create Profile")}
                  @save-profile=${(e: CustomEvent) =>
                    this.createProfile(e.detail.profile)}
                ></edit-profile>
              </group-context>
            `
          : html``}
      </sl-dialog>
    `;
  }

  static styles = weStyles;
}
