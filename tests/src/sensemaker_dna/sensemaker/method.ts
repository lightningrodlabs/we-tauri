import { EntryHash, Record } from "@holochain/client";
import { pause, runScenario } from "@holochain/tryorama";
import { setUpAliceandBob } from "../../utils";
import { Method, Dimension } from "@neighbourhoods/client";
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

        // Given no methods have been created, When Alice gets all methods Then an empty array is returned
        const allMethodsOutput: Record[] = await callZomeAlice(
          "sensemaker",
          "get_methods",
          null,
          true
        );
        t.equal(allMethodsOutput.length, 0);

        // Alice creates input/output dimensions and two methods
        const { methods: [method1, method2], createMethodEntryHash, createMethodEntryHash2, inputDimensionEhs, outputDimensionEh } =
          await createMethods();
        t.ok(createMethodEntryHash);
        t.ok(createMethodEntryHash2);

        // Given two methods have been created, When Alice gets all methods Then array of length 2 is returned
        const allMethodsOutput2: Record[] = await callZomeAlice(
          "sensemaker",
          "get_methods",
          null,
          true
          );
        t.equal(allMethodsOutput2.length, 2);
        
        // Given two methods have been created, When Alice gets methods for dimension without QueryParams Then array of length 2 is returned (all methods)
        const methodsForDimensionNoQuery: Record[] = await callZomeAlice(
          "sensemaker",
          "get_methods_for_dimension",
          { query: null },
          true
          );
        t.equal(methodsForDimensionNoQuery.length, 2);

         // Given two methods have been created, When Alice gets methods for dimension with QueryParams for the first input dimension entry hash Then array of length 1 is returned
        const methodsForDimensionInputDimensionQuery: Record[] = await callZomeAlice(
          "sensemaker",
          "get_methods_for_dimension",
          { query: { dimensionType: "input", dimensionEh: inputDimensionEhs[0] } },
          true
          );
        t.equal(methodsForDimensionInputDimensionQuery.length, 1);
        // And the only element of the array is the method created from the first input dimension entry hash
        t.deepEqual(method1, new EntryRecord<Method>(methodsForDimensionInputDimensionQuery[0]).entry);

         // Given two methods have been created, When Alice gets methods for dimension with QueryParams for the second input dimension entry hash Then array of length 1 is returned
        const methodsForDimensionInputDimensionQuery2: Record[] = await callZomeAlice(
          "sensemaker",
          "get_methods_for_dimension",
          { query: { dimensionType: "input", dimensionEh: inputDimensionEhs[1] } },
          true
        );
        t.equal(methodsForDimensionInputDimensionQuery2.length, 1);
        // And the only element of the array is the method created from the second input dimension entry hash
        t.deepEqual(method2, new EntryRecord<Method>(methodsForDimensionInputDimensionQuery2[0]).entry);
        

      } catch (e) {
        console.error(e);
        t.ok(null);
      }

      await cleanup();

      async function createMethods() {
        // define subjective dimensions
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

        const createDimension = {
          name: "likeness",
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
          name: "awesomeness",
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

        // define objective dimension

        const integerRange2 = {
          name: "10-scale",
          kind: {
            Integer: { min: 0, max: 1000000 },
          },
        };
        const rangeRecord2: Record = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange2,
          true
        );
        const rangeHash2 = new EntryRecord<Range>(rangeRecord2).entryHash;

        const createObjectiveDimension = {
          name: "total_likeness",
          range_eh: rangeHash2,
          computed: true,
        };

        const createObjectiveDimensionRecord: Record = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createObjectiveDimension,
          true
        );
        const createObjectiveDimensionEntryHash = new EntryRecord<Dimension>(
          createObjectiveDimensionRecord
        ).entryHash;

        // create methods
        const totalLikenessMethod = {
          name: "total_likeness_method",
          input_dimension_ehs: [createDimensionEntryHash],
          output_dimension_eh: createObjectiveDimensionEntryHash,
          program: { Sum: null },
          can_compute_live: false,
          requires_validation: false,
        };

        const createMethodRecord: Record = await callZomeAlice(
          "sensemaker",
          "create_method",
          totalLikenessMethod,
          true
        );
        const createMethodEntryHash = new EntryRecord<Method>(
          createMethodRecord
        ).entryHash;

        const anotherSimilarMethod = { ...totalLikenessMethod, name: "another_similar_method", input_dimension_ehs: [createDimensionEntryHash2]};
        const createMethodRecord2: Record = await callZomeAlice(
          "sensemaker",
          "create_method",
          anotherSimilarMethod,
          true
        );

        const createMethodEntryHash2 = new EntryRecord<Method>(
          createMethodRecord2
        ).entryHash;
        t.ok(createMethodEntryHash2);

        await pause(pauseDuration);

        return { methods: [totalLikenessMethod, anotherSimilarMethod], createMethodEntryHash, createMethodEntryHash2, inputDimensionEhs: [createDimensionEntryHash, createDimensionEntryHash2], outputDimensionEh: createObjectiveDimensionEntryHash };
      }
    });
  });
};
