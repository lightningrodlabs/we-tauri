
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
      await pause(500)

      await scenario.shareAllAgents();
      await pause(500)

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

      await pause(200);

      // Bob gets the created post
      const readPostOutput: Record = await bob.cells[1].callZome({
        zome_name: "test_provider",
        fn_name: "get_post",
        payload: createPostEntryHash,
      });
      t.deepEqual(createPost, decode((readPostOutput.entry as any).Present.entry) as any);

      // create range for dimension
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

      // Alice creates a dimension
      const createDimensionEntryHash: EntryHash = await alice.cells[0].callZome({
        zome_name: "sensemaker",
        fn_name: "create_dimension",
        payload: createDimension,
      });
      t.ok(createDimensionEntryHash);

      // Wait for the created entry to be propagated to the other node.
      await pause(100);


      // Bob gets the created dimension
      const createReadOutput: Record = await bob.cells[0].callZome({
        zome_name: "sensemaker",
        fn_name: "get_dimension",
        payload: createDimensionEntryHash,
      });
      t.deepEqual(createDimension, decode((createReadOutput.entry as any).Present.entry) as any);
    
      const createResourceType = {
        "name": "angryPost",
        //@ts-ignore
        "base_types": [readPostOutput.signed_action.hashed.content.entry_type.App],
        "dimension_ehs": [createDimensionEntryHash],
      }

      // Alice creates a resource type
      const createResourceTypeEntryHash: EntryHash = await alice.cells[0].callZome({
        zome_name: "sensemaker",
        fn_name: "create_resource_type",
        payload: createResourceType,
      });
      t.ok(createResourceTypeEntryHash);

      // Wait for the created entry to be propagated to the other node.
      await pause(100);


      // Bob gets the created resource type
      const createResourceTypeReadOutput: Record = await bob.cells[0].callZome({
        zome_name: "sensemaker",
        fn_name: "get_resource_type",
        payload: createResourceTypeEntryHash,
      });
      t.deepEqual(createResourceType, decode((createResourceTypeReadOutput.entry as any).Present.entry) as any);

      // create an assessment on the Post
      const createAssessment = {
        "value": { "Integer": 2 },
        "dimension_eh": createDimensionEntryHash,
        "subject_eh": createPostEntryHash,
        "maybe_input_dataset": null,
      }

      const createAssessmentEntryHash: EntryHash = await alice.cells[0].callZome({
        zome_name: "sensemaker",
        fn_name: "create_assessment",
        payload: createAssessment,
      });
      t.ok(createAssessmentEntryHash);

      // Wait for the created entry to be propagated to the other node.
      await pause(100);


      // Bob gets the created assessment
      const createAssessmentReadOutput: Record = await bob.cells[0].callZome({
        zome_name: "sensemaker",
        fn_name: "get_assessment",
        payload: createAssessmentEntryHash,
      });
      t.deepEqual(createAssessment, decode((createAssessmentReadOutput.entry as any).Present.entry) as any);

    }
    catch (e) {
      console.log(e)
      t.ok(null)
    }
  });
});
