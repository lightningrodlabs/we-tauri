import { customElement, property, state, query } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import { consume } from "@lit-labs/context";
import { localized, msg, str } from "@lit/localize";
import {
  AsyncStatus,
  lazyLoad,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import {
  FormField,
  FormFieldController,
  hashProperty,
  sharedStyles,
  wrapPathInSvg,
} from "@holochain-open-dev/elements";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";
import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import SlInput from "@shoelace-style/shoelace/dist/components/input/input.js";
import SlDropdown from "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import { mdiContentPaste } from "@mdi/js";

import {
  AppletInfo,
  EntryLocationAndInfo,
  GroupProfile,
  HrlWithContext,
  WeClient,
} from "@lightningrodlabs/we-applet";
import { weClientContext } from "@lightningrodlabs/we-applet";
import { EntryHash, encodeHashToBase64 } from "@holochain/client";
import { DnaHash } from "@holochain/client";
import { getAppletsInfosAndGroupsProfiles } from "@lightningrodlabs/we-applet";
import { mdiMagnify } from "@mdi/js";

export interface SearchResult {
  hrlsWithInfo: Array<[HrlWithContext, EntryLocationAndInfo]>;
  groupsProfiles: ReadonlyMap<DnaHash, GroupProfile>;
  appletsInfos: ReadonlyMap<EntryHash, AppletInfo>;
}

/**
 * @element search-entry
 * @fires entry-selected - Fired when the user selects some entry. Detail will have this shape: { hrl, context }
 */
@localized()
@customElement("clipboard-search")
export class ClipboardSearch extends LitElement implements FormField {
  /** Form field properties */

  /**
   * The name of the field if this element is used inside a form
   * Required only if the element is used inside a form
   */
  @property()
  name!: string;

  /**
   * The default value of the field if this element is used inside a form
   */
  @property(hashProperty("default-value"))
  defaultValue: HrlWithContext | undefined;

  /**
   * Whether this field is required if this element is used inside a form
   */
  @property()
  required = false;

  /**
   * Whether this field is disabled if this element is used inside a form
   */
  @property()
  disabled = false;

  /** Public attributes */

  /**
   * Label for the entry searching field.
   * @attr field-label
   */
  @property({ type: String, attribute: "field-label" })
  fieldLabel: string = "";

  /**
   * Label for the entry searching field.
   * @attr field-label
   */
  @property({ type: String, attribute: "placeholder" })
  placeholder: string = msg("Search entry");

  @property({ type: Number, attribute: "min-chars" })
  minChars: number = 3;

  @consume({ context: weClientContext, subscribe: true })
  @property()
  weClient!: WeClient;

  /**
   * @internal
   */
  @state()
  value!: HrlWithContext | undefined;

  /**
   * @internal
   */
  @state()
  info!: EntryLocationAndInfo | undefined;

  /**
   * @internal
   */
  _controller = new FormFieldController(this);

  reportValidity() {
    const invalid = this.required !== false && this.value === undefined;

    if (invalid) {
      this._textField.setCustomValidity(`This field is required`);
      this._textField.reportValidity();
    }

    return !invalid;
  }

  reset() {
    setTimeout(() => {
      this._textField.value = "";
      this.info = undefined;
      this.value = this.defaultValue;
    });
  }

  /**
   * @internal
   */
  @state()
  private _searchEntries:
    | StoreSubscriber<AsyncStatus<SearchResult>>
    | undefined;

  /**
   * @internal
   */
  @query("#textfield")
  private _textField!: SlInput;

  /**
   * @internal
   */
  @query("#dropdown")
  private dropdown!: SlDropdown;

  focus() {
    this._textField.focus();
    this._textField.select();
  }

  firstUpdated() {
    this._textField.addEventListener('keydown', event => {
      if (event.key === ' ') {
        event.stopPropagation();
      }
    })
  }

  async search(filter: string): Promise<SearchResult> {

    const hrls = await this.weClient.search(filter);

    const hrlsWithInfo = await Promise.all(
      hrls.map(async (hrlWithContext) => {
        const info = await this.weClient.entryInfo(hrlWithContext.hrl);
        return [hrlWithContext, info] as [
          HrlWithContext,
          EntryLocationAndInfo | undefined
        ];
      })
    );
    const filteredHrls = hrlsWithInfo.filter(
      ([hrl, info]) => info !== undefined
    ) as Array<[HrlWithContext, EntryLocationAndInfo]>;

    const { appletsInfos, groupsProfiles } =
      await getAppletsInfosAndGroupsProfiles(
        this.weClient,
        filteredHrls.map(([_, info]) => info.appletHash)
      );

    return { hrlsWithInfo: filteredHrls, groupsProfiles, appletsInfos };
  }

  onFilterChange() {
    const filter = this._textField.value;
    if (filter.length < this.minChars) {
      this._searchEntries = undefined;
      return;
    }

    this.dropdown.show();

    const store = lazyLoad(() => this.search(filter));
    this._searchEntries = new StoreSubscriber(this, () => store, () => []);
  }

  onEntrySelected(hrlWithContext: HrlWithContext, info: EntryLocationAndInfo) {
    this.dispatchEvent(
      new CustomEvent("entry-selected", {
        detail: {
          hrlWithContext,
        },
      })
    );
    this.value = hrlWithContext;
    this.info = info;

    this.dropdown.hide();
  }

  onCopyToClipboard(hrlWithContext: HrlWithContext, _info: EntryLocationAndInfo) {
    this.dispatchEvent(
      new CustomEvent("hrl-to-clipboard", {
        detail: {
          hrlWithContext,
        },
      })
    );
  }

  renderEntryList() {
    if (this._searchEntries === undefined)
      return html`<sl-menu-item disabled
        >${msg(str`Enter ${this.minChars} chars to search...`)}</sl-menu-item
      >`;
    switch (this._searchEntries.value.status) {
      case "pending":
        return Array(3).map(
          () => html`
            <sl-menu-item>
              <sl-skeleton
                effect="sheen"
                slot="prefix"
                style="height: 32px; width: 32px; border-radius: 50%; margin: 8px"
              ></sl-skeleton>
              <sl-skeleton
                effect="sheen"
                style="width: 100px; margin: 8px; border-radius: 12px"
              ></sl-skeleton>
            </sl-menu-item>
          `
        );
      case "error":
        console.error("Error searching entries: ", this._searchEntries.value.error);
        return html`
          <display-error
            style="flex: 1; display:flex"
            tooltip
            .headline=${msg("Error searching entries")}
            .error=${this._searchEntries.value.error}
          ></display-error>
        `;
      case "complete": {
        const searchResult = this._searchEntries.value.value;

        if (searchResult.hrlsWithInfo.length === 0)
          return html`<sl-menu-item disabled>
            ${msg("No entries match the filter")}
          </sl-menu-item>`;

        return html`
          ${searchResult.hrlsWithInfo.map(
            ([hrlWithContext, info]) => html`
              <sl-menu-item .info=${info} .hrl=${hrlWithContext}>
                <sl-icon
                  slot="prefix"
                  .src=${info.entryInfo.icon_src}
                  style="margin-right: 16px"
                ></sl-icon>
                <div class="row" style="align-items: center">
                  <span>${info.entryInfo.name}</span>
                  <span style="flex: 1;"></span>
                  <span class="placeholder">&nbsp;${msg("in")}&nbsp;</span>
                  ${searchResult.appletsInfos
                    .get(info.appletHash)
                    ?.groupsIds.map(
                      (groupId) => html`
                        <img
                          .src=${searchResult.groupsProfiles.get(groupId)
                            ?.logo_src}
                          alt=${`Group icon of group ${searchResult.groupsProfiles.get(groupId)
                            ?.name}`}
                          style="height: 16px; width: 16px; margin-right: 4px; border-radius: 50%"
                        />
                      `
                    )}
                  <span class="placeholder" style="margin-right: 5px;">
                    ${searchResult.appletsInfos.get(info.appletHash)
                      ?.appletName}</span
                  >
                </div>
                <div
                  slot="suffix"
                  class="row center-content to-clipboard"
                  title=${msg("Add to clipboard")}
                  @click=${(e) => {
                    e.stopPropagation();
                    this.onCopyToClipboard(hrlWithContext, info)
                  }}
                >
                  <span>+</span>
                  <sl-icon .src=${wrapPathInSvg(mdiContentPaste)}></sl-icon>
                </div>
              </sl-menu-item>
            `
          )}
        `;
      }
    }
  }

  /**
   * @internal
   */
  get _label() {
    let l = this.fieldLabel;

    if (this.required !== false) l = `${l} *`;

    return l;
  }

  render() {
    return html`
      <div style="flex: 1; display: flex; width: 600px;">
        <sl-dropdown style="display: flex; flex: 1; width: 600px;" id="dropdown" hoist>
          <sl-input
            id="textfield"
            slot="trigger"
            style="width: 600px;"
            .label=${this._label}
            .placeholder=${this.placeholder}
            @input=${() => this.onFilterChange()}
            .value=${this.info ? this.info.entryInfo.name : ""}
          >
            ${this.info
              ? html`<sl-icon
                  .src=${this.info.entryInfo.icon_src}
                  slot="prefix"
                ></sl-icon>`
              : html`<sl-icon
                  .src=${wrapPathInSvg(mdiMagnify)}
                  slot="prefix"
                ></sl-icon> `}
          </sl-input>
          <sl-menu
              style="min-width: 600px;"
            @sl-select=${(e: CustomEvent) => {
              this.onEntrySelected(e.detail.item.hrl, e.detail.item.info);
            }}
          >
            ${this.renderEntryList()}
          </sl-menu>
        </sl-dropdown>
      </div>
    `;
  }

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
        }

        .to-clipboard {
          background: #2eb2d7;
          border-radius: 5px;
          padding: 0 8px;
          box-shadow: 0 0 3px black;
        }

        .to-clipboard:hover {
          background: #7fd3eb;
        }
      `,
    ];
  }
}
