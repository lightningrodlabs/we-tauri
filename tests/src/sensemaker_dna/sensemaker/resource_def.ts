import { EntryHash, Record } from "@holochain/client";
import { pause, runScenario } from "@holochain/tryorama";
import { setUpAliceandBob } from "../../utils";
import { ResourceDef, Method, Dimension } from "@neighbourhoods/client";
import pkg from "tape-promise/tape";
import { EntryRecord } from "@holochain-open-dev/utils";
const { test } = pkg;

export default () => {
  test("test registering agent", async (t) => {
    await runScenario(async (scenario) => {
      const {
        alice,
        bob,
        cleanup,
        alice_agent_key,
        bob_agent_key,
        ss_cell_id_alice,
        ss_cell_id_bob,
        provider_cell_id_alice,
        provider_cell_id_bob,
      } = await setUpAliceandBob();

      const callZomeAlice = async (
        zome_name,
        fn_name,
        payload,
        is_ss = true
      ) => {
        return await alice.callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
          zome_name,
          fn_name,
          payload,
          provenance: alice_agent_key,
        });
      };
      const callZomeBob = async (zome_name, fn_name, payload, is_ss = true) => {
        return await bob.callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_bob : provider_cell_id_bob,
          zome_name,
          fn_name,
          payload,
          provenance: bob_agent_key,
        });
      };
      const pauseDuration = 1000;
      try {
        await scenario.shareAllAgents();
        await pause(pauseDuration);

        // Given no resource_defs have been created, When Alice gets all resource_defs Then an empty array is returned
        // const allResourceDefsOutput: Record[] = await callZomeAlice(
        //   "sensemaker",
        //   "get_resource_defs",
        //   null,
        //   true
        // );
        // t.equal(allResourceDefsOutput.length, 0);

        // Alice creates two resource_defs
        const { resource_defs: [rd1, rd2], createResourceDefEntryHash, createResourceDefEntryHash2 } =
          await createResourceDefs();
        t.ok(createResourceDefEntryHash);
        t.ok(createResourceDefEntryHash2);

        // Given two resource_defs have been created, When Alice gets all resource_defs Then array of length 2 is returned
        // const allResourceDefsOutput2: Record[] = await callZomeAlice(
        //   "sensemaker",
        //   "get_resource_defs",
        //   null,
        //   true
        //   );
        // t.equal(allResourceDefsOutput2.length, 2);
        
      } catch (e) {
        console.error(e);
        t.ok(null);
      }

      await cleanup();

      async function createResourceDefs(seed = '') {
        // create range for dimension
        const integerRange = {
          name: "10-scale",
          kind: {
            Integer: { min: 0, max: 10 },
          },
        };

        const rangeRecord: Record = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange,
          true
        );
        const rangeEntryRecord = new EntryRecord<Range>(rangeRecord);
        const rangeHash = rangeEntryRecord.entryHash;

        // Create dimensions for resource_defs
        const createDimension = {
          name: "likeness",
          range_eh: rangeHash,
          computed: false,
        };

        const createDimension2 = {
          name: "quality",
          range_eh: rangeHash,
          computed: false,
        };

        const createDimensionRecord: Record = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension,
          true
        );
        const createDimensionEntryHash = new EntryRecord<Dimension>(
          createDimensionRecord
        ).entryHash;
        t.ok(createDimensionEntryHash);

        const createDimensionRecord2: Record = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension2,
          true
        );
        const createDimensionEntryHash2 = new EntryRecord<Dimension>(
          createDimensionRecord2
        ).entryHash;

        // Create post to get base type
        // create an entry type in the provider DNA
        const createPost = {
          title: "Intro",
          content: "anger!!",
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost,
          false
        );
        
        const readPostOutput: Record = await callZomeAlice(
          "test_provider",
          "get_post",
          createPostEntryHash,
          false
        );

        const createResourceDef: ResourceDef = {
          "resource_name": "angryPost",
          //@ts-ignore
          "base_types": [readPostOutput.signed_action.hashed.content.entry_type.App],
          "dimension_ehs": [createDimensionEntryHash],
          "installed_app_id": "test_provider",
          "role_name": "test_provider_dna",
          "zome_name": "provider",
        }
        const createResourceDef2: ResourceDef = {
          "resource_name": "happyPost",
          //@ts-ignore
          "base_types": [readPostOutput.signed_action.hashed.content.entry_type.App],
          "dimension_ehs": [createDimensionEntryHash2],
          "installed_app_id": "test_provider",
          "role_name": "test_provider_dna",
          "zome_name": "provider",
        }
      
        const createResourceDefRecord: Record = await callZomeAlice(
          "sensemaker",
          "create_resource_def",
          createResourceDef,
          true
        );
        const createResourceDefEntryHash = new EntryRecord<ResourceDef>(
          createResourceDefRecord
        ).entryHash;
        
        const createResourceDefRecord2: Record = await callZomeAlice(
          "sensemaker",
          "create_resource_def",
          createResourceDef2,
          true
        );
        const createResourceDefEntryHash2 = new EntryRecord<ResourceDef>(
          createResourceDefRecord2
        ).entryHash;

        await pause(pauseDuration);

        return { resource_defs: [createResourceDef, createResourceDef2], createResourceDefEntryHash, createResourceDefEntryHash2 };
      }
    });
  });
};
