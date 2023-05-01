import { customElement, property, state, query } from "lit/decorators.js";
import { css, html, LitElement } from "lit";
import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import {
  AgentPubKey,
  EntryHash,
  DnaHash,
  decodeHashFromBase64,
  encodeHashToBase64,
} from "@holochain/client";
import {
  asyncDeriveStore,
  AsyncStatus,
  lazyLoad,
  StoreSubscriber,
} from "@holochain-open-dev/stores";
import {
  FormField,
  FormFieldController,
  hashProperty,
  sharedStyles,
} from "@holochain-open-dev/elements";
import { mapValues } from "@holochain-open-dev/utils";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/skeleton/skeleton.js";
import "@shoelace-style/shoelace/dist/components/menu/menu.js";
import "@shoelace-style/shoelace/dist/components/menu-item/menu-item.js";
import "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import SlInput from "@shoelace-style/shoelace/dist/components/input/input";
import SlDropdown from "@shoelace-style/shoelace/dist/components/dropdown/dropdown.js";

import {
  EntryInfo,
  EntryLocationAndInfo,
  HrlWithContext,
  WeServices,
} from "../types";
import { weServicesContext } from "../context";

/**
 * @element search-entry
 * @fires entry-selected - Fired when the user selects some entry. Detail will have this shape: { hrl, context }
 */
@localized()
@customElement("search-entry")
export class SearchEntry extends LitElement implements FormField {
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
   * Label for the agent searching field.
   * @attr field-label
   */
  @property({ type: String, attribute: "field-label" })
  fieldLabel!: string;

  /**
   * Profiles store for this element, not required if you embed this element inside a <profiles-context>
   */
  @consume({ context: weServicesContext, subscribe: true })
  @property()
  services!: WeServices;

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

  async reset() {
    this.value = this.defaultValue;
    this._textField.value = "";
  }

  /**
   * @internal
   */
  @state()
  private _searchEntries:
    | StoreSubscriber<
        AsyncStatus<Array<[HrlWithContext, EntryLocationAndInfo | undefined]>>
      >
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

  async search(
    filter: string
  ): Promise<Array<[HrlWithContext, EntryLocationAndInfo | undefined]>> {
    const hrls = await this.services.search(filter);

    const hrlsWithInfo = await Promise.all(
      hrls.map(async (hrlWithContext) => {
        const info = await this.services.getEntryInfo(hrlWithContext.hrl);
        return [hrlWithContext, info] as [
          HrlWithContext,
          EntryLocationAndInfo | undefined
        ];
      })
    );
    return hrlsWithInfo;
  }

  onFilterChange() {
    const filter = this._textField.value;
    if (filter.length < 3) {
      this._searchEntries = undefined;
      return;
    }

    this.dropdown.show();

    const store = lazyLoad(() => this.search(filter));
    this._searchEntries = new StoreSubscriber(this, () => store);
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

  renderEntryList() {
    if (this._searchEntries === undefined) return html``;
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
        return html`
          <display-error
            style="flex: 1; display:flex"
            tooltip
            .headline=${msg("Error searching entries")}
            .error=${this._searchEntries.value.error.data.data}
          ></display-error>
        `;
      case "complete": {
        const entries = this._searchEntries.value.value.filter(
          ([hrlWithContext, info]) => info !== undefined
        ) as Array<[HrlWithContext, EntryLocationAndInfo]>;

        if (entries.length === 0)
          return html`<sl-menu-item>
            ${msg("No entries match the filter")}
          </sl-menu-item>`;

        return html`
          ${entries.map(
            ([hrlWithContext, info]) => html`
              <sl-menu-item .info=${info} .hrl=${hrlWithContext}>
                <sl-icon
                  slot="prefix"
                  .src=${info.entryInfo.icon_src}
                  style="margin-right: 16px"
                ></sl-icon>
                ${info.entryInfo.name}
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
    let l = this.fieldLabel ? this.fieldLabel : msg("Search Entry");

    if (this.required !== false) l = `${l} *`;

    return l;
  }

  render() {
    return html`
      <div style="flex: 1; display: flex;">
        <sl-dropdown id="dropdown">
          <sl-input
            id="textfield"
            slot="trigger"
            .label=${this._label}
            .placeholder=${msg("At least 3 chars...")}
            @input=${() => this.onFilterChange()}
            .value=${this.info?.entryInfo.name}
          >
            ${this.info
              ? html`<sl-icon
                  .src=${this.info.entryInfo.icon_src}
                  slot="prefix"
                ></sl-icon>`
              : html``}
          </sl-input>
          <sl-menu
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
      `,
    ];
  }
}
