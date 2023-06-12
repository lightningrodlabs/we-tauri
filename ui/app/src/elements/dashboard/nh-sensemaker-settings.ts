import { ProfilesStore, profilesStoreContext } from "@holochain-open-dev/profiles";
import { DnaHash, EntryHash, encodeHashToBase64 } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { Button, CircularProgress, Icon, IconButton, LinearProgress, Snackbar, Select, ListItem } from "@scoped-elements/material-web";
import { SlTooltip } from "@scoped-elements/shoelace";
import { css, html, LitElement } from "lit";
import { StoreSubscriber, TaskSubscriber } from "lit-svelte-stores";
import { property, query, state } from "lit/decorators.js";
import { matrixContext, weGroupContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { sharedStyles } from "../../sharedStyles";
import { AppletInstanceStatusList } from "../components/applet-instance-status-list";
import { UninstalledAppletInstanceList } from "../components/uninstalled-applet-instance-list";
import { InvitationsBlock } from "../components/invitations-block";
import { LeaveGroupDialog } from "../dialogs/leave-group-dialog";
import { AppletNotInstalled } from "./applet-not-installed";
import { JoinableAppletInstanceList } from "../components/joinable-applet-instance-list";
import { SensemakerStore, sensemakerStoreContext } from "@neighbourhoods/client";
import { get } from "svelte/store";



export class NHSensemakerSettings extends ScopedElementsMixin(LitElement) {


  @contextProvided({ context: sensemakerStoreContext, subscribe: true })
  _sensemakerStore!: SensemakerStore;

  sensemakerPrimitives = new StoreSubscriber(this, () => this._sensemakerStore.appletConfig());

  // for each resource def, have a dropdown, which is all the dimensions available
  render() {
    const dimensionOptions = html`
        ${Object.keys(this.sensemakerPrimitives.value.methods).map((methodName) => {
            return html`
                <mwc-list-item value=${methodName}>${methodName}</mwc-list-item>
            `
            })}
    ` 
    return html`
        <div>Settings for SM</div>
        ${Object.entries(this.sensemakerPrimitives.value.resource_defs).map(([key, value]) => {
            const resourceDefEh = encodeHashToBase64(value);
            const activeMethodEh = get(this._sensemakerStore.activeMethod())[resourceDefEh];
            const activeMethod = Object.entries(this.sensemakerPrimitives.value.methods).find(([methodName, methodEh]) => encodeHashToBase64(methodEh) === activeMethodEh);

            return html`
                <mwc-select label=${key} value=${activeMethod ? activeMethod[0] : null} @change=${(e) => this.updateActiveMethod(e, resourceDefEh)}>
                    ${dimensionOptions}
                </mwc-select>
            ` 
        })}
    `
  }

  updateActiveMethod(event, resourceDefEh) {
    console.log('selected method', event.target.value)
    const selectedMethodName = event.target.value;
    const activeMethodEh = get(this._sensemakerStore.activeMethod())[resourceDefEh];
    const activeMethod = Object.entries(this.sensemakerPrimitives.value.methods).find(([methodName, methodEh]) => encodeHashToBase64(methodEh) === activeMethodEh);
    if (activeMethod === selectedMethodName) return;
    else {
        this._sensemakerStore.updateActiveMethod(resourceDefEh, encodeHashToBase64(this.sensemakerPrimitives.value.methods[selectedMethodName]));
    }
  }
  static get scopedElements() {
    return {
      "mwc-select": Select,
      "mwc-list-item": ListItem,
    };
  }


  static get styles() {
    const localStyles = css`
      :host {
        display: flex;
      }
    `;

    return [sharedStyles, localStyles];
  }

}
