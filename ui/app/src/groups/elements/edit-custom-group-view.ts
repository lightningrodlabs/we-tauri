import { consume } from "@lit-labs/context";
import { localized, msg } from "@lit/localize";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ActionHash, encodeHashToBase64, EntryHash } from "@holochain/client";
import { hashProperty, sharedStyles } from "@holochain-open-dev/elements";
import { BlockType } from "applet-messages";
import { BlockProperties } from "grapesjs";
import {
  asyncDeriveAndJoin,
  AsyncReadable,
  join,
  mapAndJoin,
  StoreSubscriber,
} from "@holochain-open-dev/stores";

import "@holochain-open-dev/elements/dist/elements/display-error.js";
import "@shoelace-style/shoelace/dist/components/spinner/spinner.js";

import "../../custom-views/elements/edit-custom-view.js";
import { groupStoreContext } from "../context.js";
import { GroupStore } from "../group-store.js";
import { Applet } from "../../applets/types.js";
import { CustomView } from "../../custom-views/types.js";
import { EntryRecord } from "@holochain-open-dev/utils";
import { appletOrigin } from "../../utils.js";

@localized()
@customElement("edit-custom-group-view")
export class EditCustomGroupView extends LitElement {
  @property(hashProperty("custom-view-hash"))
  customViewHash!: ActionHash;

  @consume({ context: groupStoreContext, subscribe: true })
  @state()
  groupStore!: GroupStore;

  _blocks = new StoreSubscriber(
    this,
    () =>
      join([
        this.groupStore.customViewsStore.customViews.get(this.customViewHash),
        asyncDeriveAndJoin(this.groupStore.allBlocks, (allBlocks) =>
          mapAndJoin(allBlocks, (_, appletHash) =>
            this.groupStore.applets.get(appletHash)
          )
        ),
      ]) as AsyncReadable<
        [
          EntryRecord<CustomView>,
          [
            ReadonlyMap<EntryHash, Record<string, BlockType>>,
            ReadonlyMap<EntryHash, Applet | undefined>
          ]
        ]
      >,
    () => [this.customViewHash, this.groupStore]
  );

  renderContent(
    customView: EntryRecord<CustomView>,
    blocksByApplet: ReadonlyMap<EntryHash, Record<string, BlockType>>,
    applets: ReadonlyMap<EntryHash, Applet | undefined>
  ) {
    const blocks: Array<BlockProperties> = [];

    for (const [appletHash, blockTypes] of Array.from(
      blocksByApplet.entries()
    )) {
      for (const [blockName, block] of Object.entries(blockTypes)) {
        blocks.push({
          label: block.label,
          media: block.icon_src,
          category: applets.get(appletHash)?.custom_name,
          content: `<iframe src="${appletOrigin(
            appletHash
          )}?view=applet-view&view-type=block&block=${blockName}"></iframe>`,
        });
      }
    }

    return html`<edit-custom-view
      .currentRecord=${customView}
      .blocks=${blocks}
      style="flex: 1"
    ></edit-custom-view>`;
  }

  render() {
    switch (this._blocks.value.status) {
      case "pending":
        return html`<div class="row center-content" style="flex: 1">
          <sl-spinner style="font-size: 2rem"></sl-spinner>
        </div>`;
      case "complete":
        return this.renderContent(
          this._blocks.value.value[0],
          this._blocks.value.value[1][0],
          this._blocks.value.value[1][1]
        );
      case "error":
        return html`<display-error
          .headline=${msg("Error fetching the blocks for this group")}
          .error=${this._blocks.value.error}
        ></display-error>`;
    }
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
      }
    `,
  ];
}
