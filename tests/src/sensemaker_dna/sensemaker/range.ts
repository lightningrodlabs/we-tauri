
import { DnaSource, Record, ActionHash } from "@holochain/client";
import { pause, runScenario } from "@holochain/tryorama";
import { decode } from '@msgpack/msgpack';
import pkg from 'tape-promise/tape';
const { test } = pkg;

import { sensemakerDnaDna } from  "../../utils";


export default () => test("range CRUD tests", async (t) => {
  await runScenario(async scenario => {

    const dnas: DnaSource[] = [{path: sensemakerDnaDna }];

    const [alice, bob]  = await scenario.addPlayersWithHapps([dnas, dnas]);

    await scenario.shareAllAgents();

    const createInput = {
  "name": "forest windows burn",
  "kind": "You're a very talented young man, with your own clever thoughts and ideas. It's nice to play a character that has a soulful, dependent, close relationship. You really think you can fly that thing?"
};

    // Alice creates a range
    const createActionHash: ActionHash = await alice.cells[0].callZome({
      zome_name: "sensemaker",
      fn_name: "create_range",
      payload: createInput,
    });
    t.ok(createActionHash);

    // Wait for the created entry to be propagated to the other node.
    await pause(100);

    
    // Bob gets the created range
    const createReadOutput: Record = await bob.cells[0].callZome({
      zome_name: "sensemaker",
      fn_name: "get_range",
      payload: createActionHash,
    });
    t.deepEqual(createInput, decode((createReadOutput.entry as any).Present.entry) as any);
    
    
    // Alice updates the range
    const contentUpdate = {
  "name": "close 'Cause virus",
  "kind": " go, go, go, go, go! Hey, take a look at the earthlings.  go, go, go, go, go!"
}

    const updateInput = {
      original_action_hash: createActionHash,
      updated_range: contentUpdate,
    };

    const updateActionHash: ActionHash = await alice.cells[0].callZome({
      zome_name: "sensemaker",
      fn_name: "update_range",
      payload: updateInput,
    });
    t.ok(updateActionHash); 

    // Wait for the updated entry to be propagated to the other node.
    await pause(100);

      
    // Bob gets the updated range
    const readUpdatedOutput: Record = await bob.cells[0].callZome({
      zome_name: "sensemaker",
      fn_name: "get_range",
      payload: updateActionHash,
    });
    t.deepEqual(contentUpdate, decode((readUpdatedOutput.entry as any).Present.entry) as any); 

    
    
    // Alice deletes the range
    const deleteActionHash = await alice.cells[0].callZome({
      zome_name: "sensemaker",
      fn_name: "delete_range",
      payload: createActionHash,
    });
    t.ok(deleteActionHash); 

      
    // Wait for the deletion action to be propagated to the other node.
    await pause(100);

    // Bob tries to get the deleted range, but he doesn't get it because it has been deleted
    const readDeletedOutput = await bob.cells[0].callZome({
      zome_name: "sensemaker",
      fn_name: "get_range",
      payload: createActionHash,
    });
    t.notOk(readDeletedOutput);

    
  });



});
