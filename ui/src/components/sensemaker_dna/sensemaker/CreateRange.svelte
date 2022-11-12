<script lang="ts">
import { createEventDispatcher, getContext } from 'svelte';
import '@material/mwc-button';
import { InstalledCell, AppWebsocket, InstalledAppInfo } from '@holochain/client';

import { appWebsocketContext, appInfoContext } from '../../../contexts';
import { Range } from '../../../types/sensemaker_dna/sensemaker';
import '@type-craft/title/create-title';
import '@type-craft/content/create-content';

let appInfo = getContext(appInfoContext).getAppInfo();
let appWebsocket = getContext(appWebsocketContext).getAppWebsocket();

const dispatch = createEventDispatcher();

let name: string | undefined;
let kind: string | undefined;

$: name, kind;

async function createRange() {
  const cellData = appInfo.cell_data.find((c: InstalledCell) => c.role_id === 'sensemaker_dna')!;

  const range: Range = {
    name: name!,
        kind: kind!,
  };

  
  const actionHash = await appWebsocket.callZome({
    cap_secret: null,
    cell_id: cellData.cell_id,
    zome_name: 'sensemaker',
    fn_name: 'create_range',
    payload: range,
    provenance: cellData.cell_id[1]
  });

  dispatch('range-created', { actionHash });
}

</script>
<div style="display: flex; flex-direction: column">
  <span style="font-size: 18px">Create Range</span>

  <create-title
      
      on:change="{e => name = e.target.value}"
      style="margin-top: 16px"
    ></create-title>

  <create-content
      
      on:change="{e => kind = e.target.value}"
      style="margin-top: 16px"
    ></create-content>

  <mwc-button 
    label="Create Range"
    disabled={!(name && kind)}
    on:click="{() => createRange()}"
  ></mwc-button>
</div>
