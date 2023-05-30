import { notifyError, onSubmit } from "@holochain-open-dev/elements";
import {
  decodeHashFromBase64,
  DnaHash,
  encodeHashToBase64,
} from "@holochain/client";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import SlDialog from "@shoelace-style/shoelace/dist/components/dialog/dialog";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import {
  AsyncReadable,
  join,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import { CloneDnaRecipe } from "@holochain-open-dev/membrane-invitations";
import { GroupProfile } from "@lightningrodlabs/we-applet";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/dialog/dialog.js";
import "@shoelace-style/shoelace/dist/components/alert/alert.js";
import "@shoelace-style/shoelace/dist/components/select/select.js";
import "@shoelace-style/shoelace/dist/components/option/option.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import { weStoreContext } from "../../context";
import { WeStore } from "../../we-store";
import { GroupStore } from "../group-store";
import { groupStoreContext } from "../context";

@localized()
@customElement("federate-group-dialog")
export class FederateGroupDialog extends LitElement {
  @consume({ context: weStoreContext })
  _weStore!: WeStore;

  @consume({ context: groupStoreContext })
  _groupStore!: GroupStore;

  _groups = new StoreSubscriber(
    this,
    () =>
      join([
        this._weStore.allGroupsProfiles,
        this._groupStore.federatedGroups,
      ]) as AsyncReadable<
        [
          ReadonlyMap<DnaHash, GroupProfile>,
          ReadonlyMap<DnaHash, CloneDnaRecipe>
        ]
      >,
    () => [this._weStore]
  );

  @state()
  federating = false;

  show() {
    (this.shadowRoot?.getElementById("dialog") as SlDialog).show();
    (this.shadowRoot?.getElementById("form") as HTMLFormElement).reset();
  }

  async federateWithGroup(groupDnaHash: DnaHash) {
    if (this.federating) return;

    this.federating = true;
    try {
      await this._weStore.federateGroups(
        groupDnaHash,
        this._groupStore.groupDnaHash
      );

      const dialog = this.shadowRoot?.getElementById("dialog") as SlDialog;
      dialog.hide();
    } catch (e) {
      notifyError(msg("Error federating group."));
      console.error(e);
    }

    this.federating = false;
  }

  renderDialogContent() {
    switch (this._groups.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "complete":
        const federatedGroups = Array.from(this._groups.value.value[1].keys());
        const groups = Array.from(this._groups.value.value[0].entries()).filter(
          ([groupDnaHash, _]) =>
            groupDnaHash.toString() !==
              this._groupStore.groupDnaHash.toString() &&
            !federatedGroups.find(
              (federatedGroupHash) =>
                federatedGroupHash.toString() === groupDnaHash.toString()
            )
        );

        return html`
          <form
            id="form"
            ${onSubmit((f) =>
              this.federateWithGroup(decodeHashFromBase64(f.groupDnaHash))
            )}
          >
            <span
              >${msg(
                "Federating this applet will share it with another group you are part of, so that both groups have the same applet installed and their members can access it."
              )}</span
            ><br /><br />
            <span
              >${msg(
                "With which group do you want to federate this applet?"
              )}</span
            >
            <sl-select
              .placeholder=${msg("Select Group")}
              name="groupDnaHash"
              @sl-hide=${(e) => e.stopPropagation()}
              style="margin-top: 16px"
              required
            >
              ${groups.map(
                ([groupDnaHash, groupProfile]) => html`
                  <sl-option .value=${encodeHashToBase64(groupDnaHash)}>
                    <img
                      slot="prefix"
                      .src=${groupProfile?.logo_src}
                      style="height: 16px; width: 16px"
                    />${groupProfile?.name}</sl-option
                  >
                `
              )}
            </sl-select>
          </form>
          <sl-button
            slot="footer"
            @click=${() => {
              (this.shadowRoot?.getElementById("dialog") as SlDialog).hide();
            }}
            >${msg("Cancel")}</sl-button
          >
          <sl-button
            slot="footer"
            .loading=${this.federating}
            variant="primary"
            type="submit"
            form="form"
            >${msg("Federate")}</sl-button
          >
        `;

      case "error":
        return html`<display-error
          .headline=${msg("Error fetching your groups")}
          .error=${this._groups.value.error}
        ></display-error>`;
    }
  }

  render() {
    return html`<sl-dialog
      id="dialog"
      .label=${msg("Federate Applet")}
      @sl-request-close=${(e) => {
        if (this.federating) {
          e.preventDefault();
        }
      }}
    >
      ${this.renderDialogContent()}
    </sl-dialog>`;
  }
}
