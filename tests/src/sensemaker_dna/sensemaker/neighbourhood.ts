
import { DnaSource, Record, ActionHash, EntryHash } from "@holochain/client";
import { pause, runScenario } from "@holochain/tryorama";
import { decode } from '@msgpack/msgpack';
import pkg from 'tape-promise/tape';
const { test } = pkg;

import { sensemakerDnaDna, testProviderDnaDna } from "../../utils";


export default () => test("range CRUD tests", async (t) => {
  await runScenario(async scenario => {

    const dnas: DnaSource[] = [{ path: sensemakerDnaDna }, { path: testProviderDnaDna }];
    try {


      const [alice, bob] = await scenario.addPlayersWithHapps([dnas, dnas]);

      await scenario.shareAllAgents();

      // pub struct Assessment {
      //     pub value: RangeValue,
      //     pub dimension_eh: EntryHash,
      //     pub subject_eh: EntryHash,
      //     pub maybe_input_dataset: Option<DataSet>,
      // }

      const createPost = {
        "title": "Intro",
        "content": "anger!!"
      };
      const createPostEntryHash: EntryHash = await alice.cells[1].callZome({
        zome_name: "test_provider",
        fn_name: "create_post",
        payload: createPost,
      });
      t.ok(createPostEntryHash);

      const integerRange = {
        "name": "10-scale",
        "kind": {
          "Integer": { "min": 0, "max": 10 }
        },
      };

      const createDimension = {
        "name": "likeness",
        "range": integerRange,
      }

      // Alice creates a range
      const createEntryHash: EntryHash = await alice.cells[0].callZome({
        zome_name: "sensemaker",
        fn_name: "create_dimension",
        payload: createDimension,
      });
      t.ok(createEntryHash);

      // Wait for the created entry to be propagated to the other node.
      await pause(100);


      // Bob gets the created range
      const createReadOutput: Record = await bob.cells[0].callZome({
        zome_name: "sensemaker",
        fn_name: "get_dimension",
        payload: createEntryHash,
      });
      t.deepEqual(createDimension, decode((createReadOutput.entry as any).Present.entry) as any);
    }
    catch (e) {
      console.log(e)
    }
  });
});
