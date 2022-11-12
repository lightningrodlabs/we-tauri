<script lang="ts">
import { onMount, getContext } from 'svelte';
import '@material/mwc-circular-progress';
import { decode } from '@msgpack/msgpack';
import { InstalledCell, Record, ActionHash, AppWebsocket, InstalledAppInfo } from '@holochain/client';
import { appInfoContext, appWebsocketContext } from '../../../contexts';
import { Range } from '../../../types/sensemaker_dna/sensemaker';
import '@type-craft/title/title-detail';
import '@type-craft/content/content-detail';

export let actionHash: ActionHash;

let appInfo = getContext(appInfoContext).getAppInfo();
let appWebsocket = getContext(appWebsocketContext).getAppWebsocket();

let range: Range | undefined;

$: range;

onMount(async () => {
  const cellData = appInfo.cell_data.find((c: InstalledCell) => c.role_id === 'sensemaker_dna')!;

  const record: Record | undefined = await appWebsocket.callZome({
    cap_secret: null,
    cell_id: cellData.cell_id,
    zome_name: 'sensemaker',
    fn_name: 'get_range',
    payload: actionHash,
    provenance: cellData.cell_id[1]
  });

  if (record) {
    range = decode((record.entry as any).Present.entry) as Range;
  }
});
</script>

{#if range}
  <div style="display: flex; flex-direction: column">
    <span style="font-size: 18px">Range</span>

    
    <title-detail
    
      value={range.name}
      style="margin-top: 16px"
    ></title-detail>

    
    <content-detail
    
      value={range.kind}
      style="margin-top: 16px"
    ></content-detail>

  </div>
{:else}
  <div style="display: flex; flex: 1; align-items: center; justify-content: center">
    <mwc-circular-progress indeterminate></mwc-circular-progress>
  </div>
{/if}
