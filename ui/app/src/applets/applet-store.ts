import {
  AsyncReadable,
  lazyLoad,
  lazyLoadAndPoll,
  pipe,
} from "@holochain-open-dev/stores";
import { encodeHashToBase64, EntryHash } from "@holochain/client";
import { InternalAttachmentType } from "../../../applet-messages/dist/index.js";
import { AppletHost } from "../applet-host.js";
import { WeStore } from "../we-store.js";
import { Applet } from "./types.js";

export class AppletStore {
  constructor(
    public appletHash: EntryHash,
    public applet: Applet,
    private weStore: WeStore
  ) {}

  host: AsyncReadable<AppletHost> = lazyLoad(() => {
    const origin = `applet://${encodeHashToBase64(this.appletHash)}`;
    const iframe = document.createElement("iframe");
    iframe.src = origin;
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    return new Promise<AppletHost>((resolve) => {
      iframe.onload = () => {
        resolve(
          new AppletHost(this.appletHash, iframe, this.weStore, undefined)
        );
      };
    });
  });

  attachmentTypes: AsyncReadable<Record<string, InternalAttachmentType>> = pipe(
    this.host,
    (host) => lazyLoadAndPoll(() => host.getAttachmentTypes(), 10000)
  );

  logo = this.weStore.appletBundlesStore.appletBundleLogo
    .get(this.applet.devhub_happ_release_hash)
    .get(this.applet.devhub_gui_release_hash);
}
