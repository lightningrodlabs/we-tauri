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
        
        // Given Alice has created 2 input dimensions,
        // When Alice tries to create output dimension and method atomically with the first input dimension (happy path)
          // Alice creates input dimension
          const { inputDimensions: [dimension1, _], inputDimensionEhs: [inputDimensionEh, inputDimensionEh2], outputDimensionRangeHash } =
            await createInputDimensions();
          t.ok(inputDimensionEh);
          t.ok(outputDimensionRangeHash);

          // Declare inputs
          const totalLikenessMethod: Partial<Method> = {
            name: "total_likeness_method",
            input_dimension_ehs: [inputDimensionEh],
            output_dimension_eh: undefined,
            program: { Sum: null },
            can_compute_live: false,
            requires_validation: false,
          };
          const createObjectiveDimension = {
            name: "total_likeness",
            range_eh: outputDimensionRangeHash,
            computed: true,
          };

        const [dimensionRecord, methodRecord] = await callZomeAlice(
          "sensemaker",
          "atomic_create_dimension_with_method",
          { partial_method: totalLikenessMethod, output_dimension: createObjectiveDimension },
          true
        );

        const dimensionEntryRecord = new EntryRecord<Dimension>(dimensionRecord);
        const methodEntryRecord = new EntryRecord<Method>(methodRecord);
        // Then two entries are created
        t.ok(dimensionEntryRecord.entryHash, 'created an output dimension atomically');
        t.ok(methodEntryRecord.entryHash, 'created a method atomically');

        // And When Alice gets all methods Then array of length 1 is returned
        const allMethodsOutput1: Record[] = await callZomeAlice(
          "sensemaker",
          "get_methods",
          null,
          true
          );
        t.equal(allMethodsOutput1.length, 1);

        // And When Alice gets methods for dimension with QueryParams for the first input dimension entry hash Then array of length 1 is returned
        const methodsForDimensionInputDimensionQuery1: Record[] = await callZomeAlice(
          "sensemaker",
          "get_methods_for_dimension",
          { query: { dimensionType: "input", dimensionEh: inputDimensionEh } },
          true
        );
        t.equal(methodsForDimensionInputDimensionQuery1.length, 1);

        // And the only element of the array is the method with an output dimension created at the same time
        t.deepEqual(methodEntryRecord.entry.output_dimension_eh, dimensionEntryRecord.entryHash);


        // Given Alice has created 2 input dimensions and one (output dimension and method, atomically with the first input dimension),
        // When Alice attempts to create another output dimension & method atomically, with bad inputs (sad path 1)
          // (objective dimension is not actually objective)
          const totalLikenessMethod2: Partial<Method> = {
            name: "total_likeness_method_2",
            input_dimension_ehs: [inputDimensionEh2],
            output_dimension_eh: undefined,
            program: { Sum: null },
            can_compute_live: false,
            requires_validation: false,
          };
          const createObjectiveDimension2 = {
            name: "total_likeness_2",
            range_eh: outputDimensionRangeHash,
            computed: false,
          };
        // Then we get an error telling us to use another endpoint
        try {
          await callZomeAlice(
            "sensemaker",
            "atomic_create_dimension_with_method",
            { partial_method: totalLikenessMethod2, output_dimension: createObjectiveDimension2 },
            true
          );
        } catch (e) {
          //@ts-ignore
          t.ok(e.message.match("to succeed in atomic operation, this endpoint requires an objective/output dimension as input."), "using output dimension as input dimension returns an error");
        }

        // When Alice attempts to create another output dimension & method atomically, with bad inputs (sad path 2)
          // (output dimension given as input is full, not partial)
        // Then we get an error telling us to use create_method endpoint, as inputs should only have a null output_dimension_eh
        try {
          await callZomeAlice(
            "sensemaker",
            "atomic_create_dimension_with_method",
            { partial_method: {...totalLikenessMethod2, output_dimension_eh: outputDimensionRangeHash }, output_dimension: createObjectiveDimension },
            true
          );
        } catch (e) {
          //@ts-ignore
          t.ok(e.message.match("no output dimension entry hash is needed - use the create_method endpoint instead."), "using output dimension entry hash in the input returns an error");
        }

        // Given the number of created dimensions
        const getDimensionsOutput: Record[] = await callZomeAlice(
          "sensemaker",
          "get_dimensions",
          null,
          true
        );
        t.ok(getDimensionsOutput)

        // When Alice attempts to create another output dimension & method atomically, with bad inputs (sad path 3)
          // (good dimension input, bad partial method input)
          const createObjectiveDimension3 = { // The same dimension input (but with a different name) was already tested to be valid
            name: "total_likeness_3",
            range_eh: outputDimensionRangeHash,
            computed: true,
          };

          const invalidInputMethod = {
            name: "totally_bogus_method",
            input_dimension_ehs: ["oops"],
            output_dimension_eh: null,
            program: { Sum: null },
            can_compute_live: false,
            requires_validation: false,
          };
        try {
          await callZomeAlice(
            "sensemaker",
            "atomic_create_dimension_with_method",
            { partial_method: invalidInputMethod, output_dimension: createObjectiveDimension3 },
            true
          );
        } catch (e) {
          // Then we get an error (in this case a serialization error)
          t.ok(e, "we get an error");

          // And When we get all dimensions
          const getDimensionsOutput2: Record[] = await callZomeAlice(
            "sensemaker",
            "get_dimensions",
            null,
            true
          );
          // Then no dimensions were created
          t.equal(getDimensionsOutput.length, getDimensionsOutput2.length, 'no dimensions were created');
        }

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

        const rangeRecord2: Record = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange,
          true
        );
        const rangeEntryRecord2 = new EntryRecord<Range>(rangeRecord2);
        const outputDimensionRangeHash = rangeEntryRecord2.entryHash;

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

        return { inputDimensions: [createDimension, createDimension2], inputDimensionEhs: [createDimensionEntryHash, createDimensionEntryHash2], outputDimensionRangeHash };
      }
    });
  });
};
