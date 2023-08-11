import {
  AsyncReadable,
  Writable,
  derived,
  lazyLoad,
  lazyLoadAndPoll,
  pipe,
  writable,
} from "@holochain-open-dev/stores";
import { encodeHashToBase64, EntryHash } from "@holochain/client";
import {
  AppletToParentMessage,
  BlockType,
  InternalAttachmentType,
} from "applet-messages";

import { AppletHost } from "./applet-host.js";
import { Applet } from "./types.js";
import { appletOrigin, clearAppletNotificationStatus, loadAppletNotificationStatus } from "../utils.js";
import { ConductorInfo } from "../tauri.js";
import { AppletBundlesStore } from "../applet-bundles/applet-bundles-store.js";
import { ViewFrame } from "../layout/views/view-frame.js";

export class AppletStore {
  constructor(
    public appletHash: EntryHash,
    public applet: Applet,
    public conductorInfo: ConductorInfo,
    public appletBundlesStore: AppletBundlesStore
  ) {
  this._unreadNotifications.set(loadAppletNotificationStatus(encodeHashToBase64(appletHash)));
}

  host: AsyncReadable<AppletHost> = lazyLoad(async () => {
    const appletHashBase64 = encodeHashToBase64(this.appletHash);

    let iframe = document.getElementById(appletHashBase64) as
      | HTMLIFrameElement
      | undefined;
    if (iframe) {
      return new AppletHost(iframe);
    }

    const origin = appletOrigin(this.conductorInfo, this.appletHash);
    iframe = document.createElement("iframe");
    iframe.id = appletHashBase64;
    iframe.src = origin;
    iframe.style.display = "none";

    // add the applet main view into the container to receive notifications etc.
    const appletMainView: ViewFrame = document.createElement("view-frame") as ViewFrame;
    appletMainView.appletHash = this.appletHash;
    appletMainView.renderView = {
      type: "applet-view",
      view: {
        type: "main",
      }
    };

    iframe.appendChild(appletMainView);
    // add the iframe inside the app-container (<we-app></we-app> tag in index.html) to have the WeStore context
    const appContainer = document.getElementById("app-container");
    appContainer!.appendChild(iframe);
    // document.body.appendChild(iframe);

    return new Promise<AppletHost>((resolve) => {
      console.log("\n@AppletStore @host: adding event listener.\n");
      window.addEventListener("message", (message) => {
        if (message.source === iframe?.contentWindow) {
          if (
            (message.data as AppletToParentMessage).request.type === "ready"
          ) {
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

  logo = this.appletBundlesStore.appletBundleLogo.get(
    this.applet.appstore_app_hash
  );

  _unreadNotifications: Writable<[string | undefined, number | undefined]> = writable([undefined, undefined]);

  unreadNotifications() {
    return derived(this._unreadNotifications, (store) => store)
  }

  setUnreadNotifications(unreadNotifications: [string | undefined, number | undefined]) {
    this._unreadNotifications.set(unreadNotifications);
  }

  clearNotificationStatus() {
    clearAppletNotificationStatus(encodeHashToBase64(this.appletHash));
    this._unreadNotifications.set([undefined, undefined])
  }
}
