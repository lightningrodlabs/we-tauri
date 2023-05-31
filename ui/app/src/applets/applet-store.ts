import {
  AsyncReadable,
  lazyLoad,
  lazyLoadAndPoll,
  pipe,
} from "@holochain-open-dev/stores";
import { encodeHashToBase64, EntryHash } from "@holochain/client";
import { BlockType, InternalAttachmentType } from "applet-messages";

import { AppletHost } from "./applet-host.js";
import { WeStore } from "../we-store.js";
import { Applet } from "./types.js";
import { appletOrigin } from "../utils.js";

export class AppletStore {
  constructor(
    public appletHash: EntryHash,
    public applet: Applet,
    private weStore: WeStore
  ) {}

  host: AsyncReadable<AppletHost> = lazyLoad(async () => {
    const appletHashBase64 = encodeHashToBase64(this.appletHash);

    let iframe = document.getElementById(appletHashBase64) as
      | HTMLIFrameElement
      | undefined;
    if (iframe) {
      return new AppletHost(iframe);
    }

    const origin = appletOrigin(this.appletHash);
    iframe = document.createElement("iframe");
    iframe.id = appletHashBase64;
    iframe.src = origin;
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    return new Promise<AppletHost>((resolve) => {
      window.addEventListener("message", (message) => {
        if (message.source === iframe?.contentWindow) {
          if (message.data.type === "ready") {
            resolve(new AppletHost(iframe!));
          }
        }
      });
    });
  });

  attachmentTypes: AsyncReadable<Record<string, InternalAttachmentType>> = pipe(
    this.host,
    (host) => lazyLoadAndPoll(() => host.getAttachmentTypes(), 10000)
  );

  blocks: AsyncReadable<Record<string, BlockType>> = pipe(this.host, (host) =>
    lazyLoadAndPoll(() => host.getBlocks(), 10000)
  );

  logo = this.weStore.appletBundlesStore.appletBundleLogo.get(
    this.applet.devhub_happ_release_hash
  );
}
