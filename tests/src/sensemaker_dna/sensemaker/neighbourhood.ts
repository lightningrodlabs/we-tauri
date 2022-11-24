
import { DnaSource, Record, ActionHash, EntryHash } from "@holochain/client";
import { pause, runScenario, Scenario, createConductor, addAllAgentsToAllConductors, cleanAllConductors } from "@holochain/tryorama";
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
  /*
  test("SM entry type CRUD tests", async (t) => {
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
    
      await alice.shutDown();
      await bob.shutDown();
      await cleanAllConductors();
    });
  });
  test("test CA progenitor pattern", async (t) => {
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

      await pause(500);

      const readPostOutput: Record = await callZomeBob(
        "test_provider",
        "get_post",
        createPostEntryHash
      );

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
      const createDimensionEntryHash: EntryHash = await callZomeAlice(
        "sensemaker",
        "create_dimension",
        createDimension,
        true
      )

      // Bob creates a dimension but fails
      try {
        await callZomeBob(
          "sensemaker",
          "create_dimension",
          createDimension,
          true
        )
      } catch (e) {
        t.deepEqual(e, {
          type: "error",
          data: {
            type: "internal_error",
            data: "Source chain error: InvalidCommit error: only the community activator can create this entry",
          },
        });
      }


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

      // Wait for the created entry to be propagated to the other node.
      await pause(100);

      // Bob creates a resource type but fails
      try {
        await callZomeBob(
          "sensemaker",
          "create_resource_type",
          createResourceType,
          true
        );
      } catch (e) {
        t.deepEqual(e, {
          type: "error",
          data: {
            type: "internal_error",
            data: "Source chain error: InvalidCommit error: only the community activator can create this entry",
          },
        });
      }

      // Wait for the created entry to be propagated to the other node.
      await pause(100);


      // Alice creates a method
      const totalLikenessMethod = {
        "name": "total_likeness_method",
        "target_resource_type_eh": createResourceTypeEntryHash,
        "input_dimension_ehs": [createDimensionEntryHash],
        "output_dimension_eh": createDimensionEntryHash,
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

      // bob creates a method but fails
      try {
        await callZomeBob(
          "sensemaker",
          "create_method",
          totalLikenessMethod,
          true
        )
      } catch (e) {
        t.deepEqual(e, {
          type: "error",
          data: {
            type: "internal_error",
            data: "Source chain error: InvalidCommit error: only the community activator can create this entry",
          },
        });

        const threshold = {
          "dimension_eh": createDimensionEntryHash,
          "kind": { "Equal": null },
          "value": { "Integer": 5 },
        }
        const culturalContext = {
          "name": "testcontext",
          "resource_type_eh": createResourceTypeEntryHash,
          "thresholds": [threshold],
          "order_by": [[createDimensionEntryHash, { "Biggest": null }]], // DimensionEh
        }
        try {
          await callZomeBob(
            "sensemaker",
            "create_cultural_context",
            culturalContext,
            true
          )
        } catch (e) {
          t.deepEqual(e, {
            type: "error",
            data: {
              type: "internal_error",
              data: "Source chain error: InvalidCommit error: only the community activator can create this entry",
            },
          });
        }
        await pause(100)
      }
      await alice.shutDown();
      await bob.shutDown();
      await cleanAllConductors();
    })
  })
  */
  test("test context result creation", async (t) => {
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
          "title": "post 1",
          "content": "hey!"
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost,
        );
        t.ok(createPostEntryHash);

        const createPost2 = {
          "title": "post 2",
          "content": "bye!"
        };
        const createPostEntryHash2: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost2,
        );
        t.ok(createPostEntryHash2);

        const createPost3 = {
          "title": "post 3",
          "content": "I'm back!"
        };
        const createPostEntryHash3: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost3,
        );
        t.ok(createPostEntryHash3);
        await pause(500);

        // Bob gets the created post
        const readPostOutput: Record = await callZomeBob(
          "test_provider",
          "get_post",
          createPostEntryHash
        );
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
        const createDimensionEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension,
          true
        )
        t.ok(createDimensionEntryHash);

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
        const createP1Assessment = {
          "value": { "Integer": 4 },
          "dimension_eh": createDimensionEntryHash,
          "subject_eh": createPostEntryHash,
          "maybe_input_dataset": null,
        }

        const createP1AssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP1Assessment,
          true
        );
        t.ok(createP1AssessmentEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(100);

        // create a second assessment on the Post
        const createP1Assessment2 = {
          "value": { "Integer": 4 },
          "dimension_eh": createDimensionEntryHash,
          "subject_eh": createPostEntryHash,
          "maybe_input_dataset": null,
        }

        const createP1AssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP1Assessment2,
          true
        );
        t.ok(createP1AssessmentEntryHash2);


        const createP2Assessment = {
          "value": { "Integer": 3 },
          "dimension_eh": createDimensionEntryHash,
          "subject_eh": createPostEntryHash2,
          "maybe_input_dataset": null,
        }

        const createP2AssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP2Assessment,
          true
        );
        t.ok(createP2AssessmentEntryHash);

        // create an assessment on the Post
        const createP2Assessment2 = {
          "value": { "Integer": 3 },
          "dimension_eh": createDimensionEntryHash,
          "subject_eh": createPostEntryHash2,
          "maybe_input_dataset": null,
        }

        const createP2AssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP2Assessment2,
          true
        );
        t.ok(createP2AssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(100);

        // create a second assessment on the Post
        const createP3Assessment = {
          "value": { "Integer": 2 },
          "dimension_eh": createDimensionEntryHash,
          "subject_eh": createPostEntryHash3,
          "maybe_input_dataset": null,
        }

        const createP3AssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP3Assessment,
          true
        );
        t.ok(createP3AssessmentEntryHash);


        const createP3Assessment2 = {
          "value": { "Integer": 2 },
          "dimension_eh": createDimensionEntryHash,
          "subject_eh": createPostEntryHash3,
          "maybe_input_dataset": null,
        }

        const createP3AssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP3Assessment2,
          true
        );
        t.ok(createP3AssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(100);


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

        const runMethodInput2 = {
          "resource_eh": createPostEntryHash2,
          "method_eh": createMethodEntryHash,
        }

        const runMethodOutput2: EntryHash = await callZomeAlice(
          "sensemaker",
          "run_method",
          runMethodInput2,
          true
        )
        t.ok(runMethodOutput2);

        const runMethodInput3 = {
          "resource_eh": createPostEntryHash3,
          "method_eh": createMethodEntryHash,
        }

        const runMethodOutput3: EntryHash = await callZomeAlice(
          "sensemaker",
          "run_method",
          runMethodInput3,
          true
        )
        t.ok(runMethodOutput3);

        await pause(100)

        const readObjectiveAssessmentOutput: Record = await callZomeBob(
          "sensemaker",
          "get_assessment",
          runMethodOutput,
          true
        );

        const objectiveAssessment = {
          "value": { "Integer": createP1Assessment.value.Integer + createP1Assessment2.value.Integer },
          "dimension_eh": createObjectiveDimensionEntryHash,
          "subject_eh": createPostEntryHash,
          "maybe_input_dataset": null,
        }
        t.deepEqual(objectiveAssessment, decode((readObjectiveAssessmentOutput.entry as any).Present.entry) as any);

        const readObjectiveAssessmentOutput2: Record = await callZomeBob(
          "sensemaker",
          "get_assessment",
          runMethodOutput2,
          true
        );

        const objectiveAssessment2 = {
          "value": { "Integer": createP2Assessment.value.Integer + createP2Assessment2.value.Integer },
          "dimension_eh": createObjectiveDimensionEntryHash,
          "subject_eh": createPostEntryHash2,
          "maybe_input_dataset": null,
        }
        t.deepEqual(objectiveAssessment2, decode((readObjectiveAssessmentOutput2.entry as any).Present.entry) as any);

        const readObjectiveAssessmentOutput3: Record = await callZomeBob(
          "sensemaker",
          "get_assessment",
          runMethodOutput3,
          true
        );

        const objectiveAssessment3 = {
          "value": { "Integer": createP3Assessment.value.Integer + createP3Assessment2.value.Integer },
          "dimension_eh": createObjectiveDimensionEntryHash,
          "subject_eh": createPostEntryHash3,
          "maybe_input_dataset": null,
        }
        t.deepEqual(objectiveAssessment3, decode((readObjectiveAssessmentOutput3.entry as any).Present.entry) as any);
        // create context and threshold

        // create 3 objective assessments, 2 meet threshold and test ordering, 1 doesn't meet to test threshold
        // 2 likes, 1 like, 0 likes
        // threshold > 0 likes
        // order biggest to smallest
        
        // compute context result for the cultural context
        //
      }

      catch (e) {
        console.log(e)
        t.ok(null)
      }
    
      await alice.shutDown();
      await bob.shutDown();
      await cleanAllConductors();
    });
  });
}
