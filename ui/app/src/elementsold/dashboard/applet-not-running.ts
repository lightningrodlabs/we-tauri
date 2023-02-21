import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import {
  Button,
  CircularProgress,
  Icon,
  IconButtonToggle,
  Snackbar,
} from "@scoped-elements/material-web";
import { css, html, LitElement } from "lit";
import { weStyles } from "../../sharedStyles";
import { JoinFromFsDialog } from "../dialogs/join-from-file-system";
import { RenderBlock } from "../components/render-block";

export class AppletNotRunning extends ScopedElementsMixin(LitElement) {
  render() {
    return html`
      <div class="flex-scrollable-parent">
        <div class="flex-scrollable-container">
          <div class="flex-scrollable-y">
            <div
              class="column center-content"
              style="flex: 1; margin-top: 50px; padding: 24px;"
            >
              <div
                style="margin-top: 70px; font-size: 1.5em; text-align: center;"
              >
                This applet is not running.
              </div>
              <div
                style="margin-top: 70px; font-size: 1.2em; text-align: center; max-width: 700px; line-height: 1.7"
              >
                Go to the <strong>Group Settings</strong> (<mwc-icon
                  style="position: relative; top: 0.25em;"
                  >settings</mwc-icon
                >) of the group in which this applet is installed to boot it up
                again.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static get scopedElements() {
    return {
      "mwc-icon": Icon,
    };
  }

  static get styles() {
    const localStyles = css`
      :host {
        display: flex;
      }
    `;

    return [weStyles, localStyles];
  }
}
