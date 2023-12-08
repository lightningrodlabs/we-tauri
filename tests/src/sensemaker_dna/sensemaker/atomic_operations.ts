import { Record } from "@holochain/client";
import { pause, runScenario } from "@holochain/tryorama";
import { setUpAliceandBob } from "../../utils";
import { Method, Dimension } from "@neighbourhoods/client";
import pkg from "tape-promise/tape";
import { EntryRecord } from "@holochain-open-dev/utils";
const { test } = pkg;

export default () => {
  test("Atomic zome functions test", async (t) => {
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

        // Alice creates input dimension
        const { inputDimensions: [dimension1, dimension2], inputDimensionEhs } =
          await createInputDimensions();
        t.ok(inputDimensionEhs[0]);
        t.ok(inputDimensionEhs[1]);

        // Given Alice creates output dimension and method atomically
        // ...

        // When Alice gets all methods Then array of length 1 is returned
        const allMethodsOutput1: Record[] = await callZomeAlice(
          "sensemaker",
          "get_methods",
          null,
          true
          );
        t.equal(allMethodsOutput1.length, 1);
        

      } catch (e) {
        console.error(e);
        t.ok(null);
      }

      await cleanup();

      async function createInputDimensions(seed = '') {
        // define subjective dimensions
        const integerRange = {
          name: "10-scale" + seed,
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

        const createDimension = {
          name: "likeness" + seed,
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
        const createDimension2 = {
          name: "awesomeness" + seed,
          range_eh: rangeHash,
          computed: false,
        };
        const createDimensionRecord2: Record = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension2,
          true
        );
        const createDimensionEntryHash2 = new EntryRecord<Dimension>(
          createDimensionRecord2
        ).entryHash;

        await pause(pauseDuration);

        return { inputDimensions: [createDimension, createDimension2], inputDimensionEhs: [createDimensionEntryHash, createDimensionEntryHash2] };
      }
    });
  });
};
