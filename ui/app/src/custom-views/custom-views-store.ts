import { CustomView } from './types';

import { lazyLoadAndPoll, AsyncReadable } from "@holochain-open-dev/stores";
import { EntryRecord, LazyHoloHashMap } from "@holochain-open-dev/utils";
import { NewEntryAction, Record, ActionHash, EntryHash, AgentPubKey } from '@holochain/client';

import { CustomViewsClient } from './custom-views-client.js';

export class CustomViewsStore {
  constructor(public client: CustomViewsClient) {}
  
  /** Custom View */

  customViews = new LazyHoloHashMap((customViewHash: ActionHash) =>
    lazyLoadAndPoll(async () => this.client.getCustomView(customViewHash), 4000)
  );
  
  /** All Custom Views */

  allCustomViews = lazyLoadAndPoll(async () => {
    const records = await this.client.getAllCustomViews();
    return records.map(r => r.actionHash);
  }, 4000);
}
