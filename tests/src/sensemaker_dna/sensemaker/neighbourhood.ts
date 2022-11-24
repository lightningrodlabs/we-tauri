
import { DnaSource, Record, ActionHash, EntryHash } from "@holochain/client";
import { pause, runScenario, Scenario, createConductor, addAllAgentsToAllConductors } from "@holochain/tryorama";
import { decode } from '@msgpack/msgpack';
import { ok } from "assert";
import pkg from 'tape-promise/tape';
import { installAgent } from "../../utils";
const { test } = pkg;

const setUpAliceandBob = async (s) => {
  const alice = await createConductor();
  const bob = await createConductor();
  const { agentsHapps: alice_happs, agent_key: alice_agent_key, ss_cell_id: ss_cell_id_alice, provider_cell_id: provider_cell_id_alice } = await installAgent(
    alice,
    "alice"
  );
  const { agentsHapps: bob_happs, agent_key: bob_agent_key, ss_cell_id: ss_cell_id_bob, provider_cell_id: provider_cell_id_bob } = await installAgent(
    bob,
    "bob",
    alice_agent_key
  );
  await addAllAgentsToAllConductors([alice, bob]);
  return { alice, bob, alice_happs, bob_happs, alice_agent_key, bob_agent_key, ss_cell_id_alice, ss_cell_id_bob, provider_cell_id_alice, provider_cell_id_bob }
}


export default () => {
  test("range CRUD tests", async (t) => {
    await runScenario(async scenario => {

      const { alice, bob, alice_happs, bob_happs, alice_agent_key, bob_agent_key, ss_cell_id_alice, ss_cell_id_bob, provider_cell_id_alice, provider_cell_id_bob } = await setUpAliceandBob(scenario);

      const callZomeAlice = async (zome_name, fn_name, payload, is_ss = false) => {
        return await alice.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
          zome_name,
          fn_name,
          payload,
          provenance: alice_agent_key
        });
      }
      const callZomeBob = async (zome_name, fn_name, payload, is_ss = false) => {
        return await bob.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_bob : provider_cell_id_bob,
          zome_name,
          fn_name,
          payload,
          provenance: bob_agent_key
        });
      }
      try {

        await scenario.shareAllAgents();
        await pause(500)

        // create an entry type in the provider DNA
        const createPost = {
          "title": "Intro",
          "content": "anger!!"
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost,
        );
        t.ok(createPostEntryHash);

        await pause(500);

        // Bob gets the created post
        const readPostOutput: Record = await callZomeBob(
          "test_provider",
          "get_post",
          createPostEntryHash
        );
        console.log(readPostOutput);
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

        const createDimension2 = {
          "name": "quality",
          "range": integerRange,
        }

        // Alice creates a dimension
        const createDimensionEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension,
          true
        )
        t.ok(createDimensionEntryHash);

        const createDimensionEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension2,
          true
        );
        t.ok(createDimensionEntryHash2);
        // Wait for the created entry to be propagated to the other node.
        await pause(100);


        // Bob gets the created dimension
        const createReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_dimension",
          createDimensionEntryHash,
          true
        );
        t.deepEqual(createDimension, decode((createReadOutput.entry as any).Present.entry) as any);

        // get all dimensions
        const getDimensionsOutput: Record[] = await callZomeBob(
          "sensemaker",
          "get_dimensions",
          null,
          true
        );
        t.equal(getDimensionsOutput.length, 2)


        const createResourceType = {
          "name": "angryPost",
          //@ts-ignore
          "base_types": [readPostOutput.signed_action.hashed.content.entry_type.App],
          "dimension_ehs": [createDimensionEntryHash],
        }

        // Alice creates a resource type
        const createResourceTypeEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_resource_type",
          createResourceType,
          true
        );
        t.ok(createResourceTypeEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(100);


        // Bob gets the created resource type
        const createResourceTypeReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_resource_type",
          createResourceTypeEntryHash,
          true
        );
        t.deepEqual(createResourceType, decode((createResourceTypeReadOutput.entry as any).Present.entry) as any);

        // create an assessment on the Post
        const createAssessment = {
          "value": { "Integer": 2 },
          "dimension_eh": createDimensionEntryHash,
          "subject_eh": createPostEntryHash,
          "maybe_input_dataset": null,
        }

        const createAssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createAssessment,
          true
        );
        t.ok(createAssessmentEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(100);

        // create a second assessment on the Post
        const createAssessment2 = {
          "value": { "Integer": 4 },
          "dimension_eh": createDimensionEntryHash,
          "subject_eh": createPostEntryHash,
          "maybe_input_dataset": null,
        }

        const createAssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createAssessment2,
          true
        );
        t.ok(createAssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(100);

        // Bob gets the created assessment
        const createAssessmentReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_assessment",
          createAssessmentEntryHash,
          true
        );
        t.deepEqual(createAssessment, decode((createAssessmentReadOutput.entry as any).Present.entry) as any);

        // define objective dimension

        const integerRange2 = {
          "name": "10-scale",
          "kind": {
            "Integer": { "min": 0, "max": 1000000 }
          },
        };

        const createObjectiveDimension = {
          "name": "total_likeness",
          "range": integerRange2,
        }

        // Alice creates a dimension
        const createObjectiveDimensionEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createObjectiveDimension,
          true
        )
        t.ok(createObjectiveDimensionEntryHash);

        // create a method
        const totalLikenessMethod = {
          "name": "total_likeness_method",
          "target_resource_type_eh": createResourceTypeEntryHash,
          "input_dimension_ehs": [createDimensionEntryHash],
          "output_dimension_eh": createObjectiveDimensionEntryHash,
          "program": { "Sum": null },
          "can_compute_live": false,
          "must_publish_dataset": false,
        }

        const createMethodEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_method",
          totalLikenessMethod,
          true
        )
        t.ok(createMethodEntryHash);
        
        await pause(100)

        // Bob gets the created method
        const createMethodReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_method",
          createMethodEntryHash,
          true
        );
        t.deepEqual(totalLikenessMethod, decode((createMethodReadOutput.entry as any).Present.entry) as any);

        // compute objective dimension
        const runMethodInput = {
          "resource_eh": createPostEntryHash,
          "method_eh": createMethodEntryHash,
        }

        const runMethodOutput: EntryHash = await callZomeAlice(
          "sensemaker",
          "run_method",
          runMethodInput,
          true
        )
        t.ok(runMethodOutput);

        await pause(100)


        const readObjectiveAssessmentOutput: Record = await callZomeBob(
          "sensemaker",
          "get_assessment",
          runMethodOutput,
          true
        );

        const objectiveAssessment = {
          "value": { "Integer": createAssessment.value.Integer + createAssessment2.value.Integer },
          "dimension_eh": createObjectiveDimensionEntryHash,
          "subject_eh": createPostEntryHash,
          "maybe_input_dataset": null,
        }
        t.deepEqual(objectiveAssessment, decode((readObjectiveAssessmentOutput.entry as any).Present.entry) as any);

      }

      catch (e) {
        console.log(e)
        t.ok(null)
      }
    });
  });
  // test("test CA progenitor pattern", async (t) => {
  //   await runScenario(async scenario => {

  //   })
  // })
}
