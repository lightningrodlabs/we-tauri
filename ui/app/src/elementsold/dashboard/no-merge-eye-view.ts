import { EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { property, state } from "lit/decorators.js";
import { matrixContext } from "../../context";
import { MatrixStore } from "../../matrix-store";
import { weStyles } from "../../sharedStyles";
import { get } from "svelte/store";
import { mergeEyeViewSadIcon } from "../../icons/merge-eye-view-sad";
import { Icon } from "@scoped-elements/material-web";

export class NoMergeEyeView extends ScopedElementsMixin(LitElement) {
  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @property()
  appletClassId!: EntryHash; // devHub hApp release hash

  render() {
    const appletClassInfo = get(
      this._matrixStore.getAppletClassInfo(this.appletClassId)
    );

    return html`
      <div
        class="column"
        style="flex: 1; align-items: center; position: relative;"
      >
        <img src=${mergeEyeViewSadIcon} />
        <div class="title default-font">
          The <b>${appletClassInfo!.title}</b> Applet does not support Merge Eye
          View (...yet?).
        </div>

        <div class="row create-applet-link center-content">
          <a
            href="https://www.npmjs.com/package/@lightningrodlabs/create-we-applet"
            >create your own we-applet</a
          >
          <mwc-icon style="margin-left: 6px; --mdc-icon-size: 17px;"
            >open_in_new</mwc-icon
          >
        </div>
      </div>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-icon": Icon,
    };
  }

  static styles = [
    weStyles,
    css`
      :host {
        display: flex;
        position: relative;
      }

      a {
        color: #232f7b;
        text-decoration: none;
      }

      a:hover {
        color: #4b5aba;
      }

      .title {
        font-size: 1.4em;
        margin-top: 50px;
      }

      .create-applet-link {
        color: #232f7b;
        font-size: 17px;
        margin-top: 147px;
        font-weight: bold;
      }

      .invisible {
        display: none;
      }

      .content {
        font-size: 1.1em;
        max-width: 500px;
        margin-top: 20px;
        text-align: center;
      }

      .applets-container {
        position: absolute;
        max-width: 400px;
        left: 96px;
        top: 7px;
        border-radius: 12px;
        padding: 8px;
        border: black 2px solid;
        background-color: #303f9f36;
      }

      .special-mode-container {
        position: absolute;
        max-width: 300px;
        right: 7px;
        top: 7px;
        border-radius: 12px;
        border: black 2px solid;
        padding: 8px;
        background-color: #ffff004f;
      }

      img {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        margin-top: 90px;
      }

      h1 {
        color: black;
      }
    `,
  ];
}
