import { DnaSource, Record, ActionHash, EntryHash, EntryHashB64, encodeHashToBase64 } from "@holochain/client";
import {
  pause,
  runScenario,
  Scenario,
  createConductor,
  addAllAgentsToAllConductors,
  cleanAllConductors,
} from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";
import { Assessment, CreateAssessmentInput, Method, RangeValueInteger, ResourceEh, GetAssessmentsForResourceInput, RangeValueFloat } from "@neighbourhoods/client";
import { ok } from "assert";
import pkg from "tape-promise/tape";
import { installAgent } from "../../utils";
const { test } = pkg;

export const setUpAliceandBob = async (
  with_config: boolean = false,
  resource_base_type?: any
) => {
  const alice = await createConductor();
  const bob = await createConductor();
  const {
    agentsHapps: alice_happs,
    agent_key: alice_agent_key,
    ss_cell_id: ss_cell_id_alice,
    provider_cell_id: provider_cell_id_alice,
  } = await installAgent(
    alice,
    "alice",
    undefined,
    with_config,
    resource_base_type
  );
  const {
    agentsHapps: bob_happs,
    agent_key: bob_agent_key,
    ss_cell_id: ss_cell_id_bob,
    provider_cell_id: provider_cell_id_bob,
  } = await installAgent(
    bob,
    "bob",
    alice_agent_key,
    with_config,
    resource_base_type
  );
  await addAllAgentsToAllConductors([alice, bob]);
  return {
    alice,
    bob,
    alice_happs,
    bob_happs,
    alice_agent_key,
    bob_agent_key,
    ss_cell_id_alice,
    ss_cell_id_bob,
    provider_cell_id_alice,
    provider_cell_id_bob,
  };
};

export default () => {
  test("SM entry type CRUD tests", async (t) => {
    await runScenario(async (scenario) => {
      const {
        alice,
        bob,
        alice_happs,
        bob_happs,
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
        is_ss = false
      ) => {
        return await alice.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
          zome_name,
          fn_name,
          payload,
          provenance: alice_agent_key,
        });
      };
      const callZomeBob = async (
        zome_name,
        fn_name,
        payload,
        is_ss = false
      ) => {
        return await bob.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_bob : provider_cell_id_bob,
          zome_name,
          fn_name,
          payload,
          provenance: bob_agent_key,
        });
      };
      try {
        const pauseDuration = 1000;
        await scenario.shareAllAgents();
        await pause(pauseDuration);

        // create an entry type in the provider DNA
        const createPost = {
          title: "Intro",
          content: "anger!!",
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost
        );
        t.ok(createPostEntryHash);
        console.log('post hash', createPostEntryHash)

        await pause(pauseDuration);

        // Bob gets the created post
        const readPostOutput: Record = await callZomeBob(
          "test_provider",
          "get_post",
          createPostEntryHash
        );
        console.log('read post record', readPostOutput);
        t.deepEqual(
          createPost,
          decode((readPostOutput.entry as any).Present.entry) as any
        );

        // create range for dimension
        const integerRange = {
          name: "10-scale",
          kind: {
            Integer: { min: 0, max: 10 },
          },
        };

        const rangeHash = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange,
          true
        );
        t.ok(rangeHash);

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

        // Alice creates a dimension
        const createDimensionEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension,
          true
        );
        t.ok(createDimensionEntryHash);

        const createDimensionEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension2,
          true
        );
        t.ok(createDimensionEntryHash2);
        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Bob gets the created dimension
        const createReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_dimension",
          createDimensionEntryHash,
          true
        );
        t.deepEqual(
          createDimension,
          decode((createReadOutput.entry as any).Present.entry) as any
        );

        // get all dimensions
        const getDimensionsOutput: Record[] = await callZomeBob(
          "sensemaker",
          "get_dimensions",
          null,
          true
        );
        t.equal(getDimensionsOutput.length, 2);

        console.log(
          "this is the entry type",
          //@ts-ignore
          readPostOutput.signed_action.hashed.content.entry_type.App
        );

        const createResourceDef = {
          name: "angryPost",
          //@ts-ignore
          base_types: [
            //@ts-ignore
            readPostOutput.signed_action.hashed.content.entry_type.App,
          ],
          dimension_ehs: [createDimensionEntryHash],
        };

        // Alice creates a resource type
        const createResourceDefEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_resource_def",
          createResourceDef,
          true
        );
        t.ok(createResourceDefEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Bob gets the created resource type
        const createResourceDefReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_resource_def",
          createResourceDefEntryHash,
          true
        );
        t.deepEqual(
          createResourceDef,
          decode(
            (createResourceDefReadOutput.entry as any).Present.entry
          ) as any
        );

        // create an assessment on the Post
        const createAssessment: CreateAssessmentInput = {
          value: { Integer: 2 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createAssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createAssessment,
          true
        );
        t.ok(createAssessmentEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // create a second assessment on the Post
        const createAssessment2: CreateAssessmentInput = {
          value: { Integer: 4 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createAssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createAssessment2,
          true
        );
        t.ok(createAssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Bob gets the created assessment
        const createAssessmentReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_assessment",
          createAssessmentEntryHash,
          true
        );
        const createAssessmentReadOutputDecoded = decode((createAssessmentReadOutput.entry as any).Present.entry) as Assessment;
        t.deepEqual(
          { ...createAssessment, author: alice_agent_key, timestamp: createAssessmentReadOutputDecoded.timestamp },
          createAssessmentReadOutputDecoded
        );

        const getAssessmentsForResourceInput: GetAssessmentsForResourceInput = {
          resource_ehs: [createPostEntryHash],
          dimension_ehs: [createDimensionEntryHash],
        }
        let assessmentsForResources: { [resource_eh: EntryHashB64]: Assessment[] } = await callZomeBob(
          "sensemaker",
          "get_assessments_for_resources",
          getAssessmentsForResourceInput,
          true
        );
        t.ok(assessmentsForResources[encodeHashToBase64(createPostEntryHash)].length === 2)
        console.log('assessments for resource', assessmentsForResources)
        t.ok(assessmentsForResources[encodeHashToBase64(createPostEntryHash)].find(assessment => JSON.stringify(assessment) === JSON.stringify({ ...createAssessment, author: alice_agent_key, timestamp: assessment.timestamp })))
        t.ok(assessmentsForResources[encodeHashToBase64(createPostEntryHash)].find(assessment => JSON.stringify(assessment) === JSON.stringify({ ...createAssessment2, author: alice_agent_key, timestamp: assessment.timestamp })))

        const getAssessmentsForResourceInput2: GetAssessmentsForResourceInput = {};
        
        assessmentsForResources = await callZomeBob(
          "sensemaker",
          "get_assessments_for_resources",
          getAssessmentsForResourceInput2,
          true
        );
        t.equal(Object.keys(assessmentsForResources).length, 1)
        t.ok(assessmentsForResources[encodeHashToBase64(createPostEntryHash)].length === 2)
        console.log('assessments for resource', assessmentsForResources)
        t.ok(assessmentsForResources[encodeHashToBase64(createPostEntryHash)].find(assessment => JSON.stringify(assessment) === JSON.stringify({ ...createAssessment, author: alice_agent_key, timestamp: assessment.timestamp })))
        t.ok(assessmentsForResources[encodeHashToBase64(createPostEntryHash)].find(assessment => JSON.stringify(assessment) === JSON.stringify({ ...createAssessment2, author: alice_agent_key, timestamp: assessment.timestamp })))
        // define objective dimension

        const integerRange2 = {
          name: "10-scale",
          kind: {
            Integer: { min: 0, max: 1000000 },
          },
        };

        const rangeHash2 = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange2,
          true
        );
        t.ok(rangeHash2);

        const createObjectiveDimension = {
          name: "total_likeness",
          range_eh: rangeHash2,
          computed: true,
        };

        // Alice creates a dimension
        const createObjectiveDimensionEntryHash: EntryHash =
          await callZomeAlice(
            "sensemaker",
            "create_dimension",
            createObjectiveDimension,
            true
          );
        t.ok(createObjectiveDimensionEntryHash);

        // create a method
        const totalLikenessMethod = {
          name: "total_likeness_method",
          input_dimension_ehs: [createDimensionEntryHash],
          output_dimension_eh: createObjectiveDimensionEntryHash,
          program: { Sum: null },
          can_compute_live: false,
          requires_validation: false,
        };

        const createMethodEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_method",
          totalLikenessMethod,
          true
        );
        t.ok(createMethodEntryHash);

        await pause(pauseDuration);

        // Bob gets the created method
        const createMethodReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_method",
          createMethodEntryHash,
          true
        );
        t.deepEqual(
          totalLikenessMethod,
          decode((createMethodReadOutput.entry as any).Present.entry) as any
        );

        // compute objective dimension
        const runMethodInput = {
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          method_eh: createMethodEntryHash,
        };

        const runMethodOutput: Assessment = await callZomeAlice(
          "sensemaker",
          "run_method",
          runMethodInput,
          true
        );
        t.ok(runMethodOutput);

        await pause(pauseDuration);

        const objectiveAssessment: Assessment = {
          value: {
            Integer:
              (createAssessment.value as RangeValueInteger).Integer + (createAssessment2.value as RangeValueInteger).Integer,
          },
          dimension_eh: createObjectiveDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          author: alice_agent_key,
          timestamp: runMethodOutput.timestamp,
          maybe_input_dataset: null,
        };
        t.deepEqual(
          objectiveAssessment,
          runMethodOutput
        );
      } catch (e) {
        console.log(e);
        t.ok(null);
      }

      await alice.shutDown();
      await bob.shutDown();
      await cleanAllConductors();
    });
  });
  test("test context result creation", async (t) => {
    await runScenario(async (scenario) => {
      const {
        alice,
        bob,
        alice_happs,
        bob_happs,
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
        is_ss = false
      ) => {
        return await alice.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
          zome_name,
          fn_name,
          payload,
          provenance: alice_agent_key,
        });
      };
      const callZomeBob = async (
        zome_name,
        fn_name,
        payload,
        is_ss = false
      ) => {
        return await bob.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_bob : provider_cell_id_bob,
          zome_name,
          fn_name,
          payload,
          provenance: bob_agent_key,
        });
      };
      try {
        // create 3 objective assessments, 2 meet threshold and test ordering, 1 doesn't meet to test threshold
        // 8 likes, 6 like, 4 likes
        // threshold > 5 likes
        // order biggest to smallest

        const pauseDuration = 1000
        await scenario.shareAllAgents();
        await pause(pauseDuration);

        // create an entry type in the provider DNA
        const createPost = {
          title: "post 1",
          content: "hey!",
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost
        );
        t.ok(createPostEntryHash);

        const createPost2 = {
          title: "post 2",
          content: "bye!",
        };
        const createPostEntryHash2: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost2
        );
        t.ok(createPostEntryHash2);

        const createPost3 = {
          title: "post 3",
          content: "I'm back!",
        };
        const createPostEntryHash3: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost3
        );
        t.ok(createPostEntryHash3);
        await pause(pauseDuration);

        // Bob gets the created post
        const readPostOutput: Record = await callZomeBob(
          "test_provider",
          "get_post",
          createPostEntryHash
        );
        t.deepEqual(
          createPost,
          decode((readPostOutput.entry as any).Present.entry) as any
        );

        // create range for dimension
        const integerRange = {
          name: "10-scale",
          kind: {
            Integer: { min: 0, max: 10 },
          },
        };

        const rangeHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange,
          true
        );
        t.ok(rangeHash);

        const createDimension = {
          name: "likeness",
          range_eh: rangeHash,
          computed: false,
        };

        // Alice creates a dimension
        const createDimensionEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension,
          true
        );
        t.ok(createDimensionEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Bob gets the created dimension
        const createReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_dimension",
          createDimensionEntryHash,
          true
        );
        t.deepEqual(
          createDimension,
          decode((createReadOutput.entry as any).Present.entry) as any
        );

        const createResourceDef = {
          name: "angryPost",
          //@ts-ignore
          base_types: [
            //@ts-ignore
            readPostOutput.signed_action.hashed.content.entry_type.App,
          ],
          dimension_ehs: [createDimensionEntryHash],
        };

        // Alice creates a resource type
        const createResourceDefEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_resource_def",
          createResourceDef,
          true
        );
        t.ok(createResourceDefEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Bob gets the created resource type
        const createResourceDefReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_resource_def",
          createResourceDefEntryHash,
          true
        );
        t.deepEqual(
          createResourceDef,
          decode(
            (createResourceDefReadOutput.entry as any).Present.entry
          ) as any
        );

        // create an assessment on the Post
        const createP1Assessment: CreateAssessmentInput = {
          value: { Integer: 4 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createP1AssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP1Assessment,
          true
        );
        t.ok(createP1AssessmentEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // create a second assessment on the Post
        const createP1Assessment2: CreateAssessmentInput = {
          value: { Integer: 4 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createP1AssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP1Assessment2,
          true
        );
        t.ok(createP1AssessmentEntryHash2);

        const createP2Assessment: CreateAssessmentInput = {
          value: { Integer: 3 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash2,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createP2AssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP2Assessment,
          true
        );
        t.ok(createP2AssessmentEntryHash);

        // create an assessment on the Post
        const createP2Assessment2: CreateAssessmentInput = {
          value: { Integer: 3 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash2,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createP2AssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP2Assessment2,
          true
        );
        t.ok(createP2AssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // create a second assessment on the Post
        const createP3Assessment: CreateAssessmentInput = {
          value: { Integer: 2 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash3,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createP3AssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP3Assessment,
          true
        );
        t.ok(createP3AssessmentEntryHash);

        const createP3Assessment2: CreateAssessmentInput = {
          value: { Integer: 2 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash3,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createP3AssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createP3Assessment2,
          true
        );
        t.ok(createP3AssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // define objective dimension

        const integerRange2 = {
          name: "10-scale",
          kind: {
            Integer: { min: 0, max: 1000000 },
          },
        };

        const rangeHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange2,
          true
        );
        t.ok(rangeHash2);

        const createObjectiveDimension = {
          name: "total_likeness",
          range_eh: rangeHash2,
          computed: true,
        };

        // Alice creates a dimension
        const createObjectiveDimensionEntryHash: EntryHash =
          await callZomeAlice(
            "sensemaker",
            "create_dimension",
            createObjectiveDimension,
            true
          );
        t.ok(createObjectiveDimensionEntryHash);

        // create a method
        //@ts-ignore
        const totalLikenessMethod: Method = {
          name: "total_likeness_method",
          input_dimension_ehs: [createDimensionEntryHash],
          output_dimension_eh: createObjectiveDimensionEntryHash,
          program: { Sum: null },
          can_compute_live: false,
          requires_validation: false,
        };

        const createMethodEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_method",
          totalLikenessMethod,
          true
        );
        t.ok(createMethodEntryHash);

        await pause(pauseDuration);

        // Bob gets the created method
        const createMethodReadOutput: Record = await callZomeBob(
          "sensemaker",
          "get_method",
          createMethodEntryHash,
          true
        );
        t.deepEqual(
          totalLikenessMethod,
          decode((createMethodReadOutput.entry as any).Present.entry) as any
        );

        // compute objective dimension
        const runMethodInput = {
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          method_eh: createMethodEntryHash,
        };

        const runMethodOutput: Assessment = await callZomeAlice(
          "sensemaker",
          "run_method",
          runMethodInput,
          true
        );
        t.ok(runMethodOutput);

        const runMethodInput2 = {
          resource_eh: createPostEntryHash2,
          resource_def_eh: createResourceDefEntryHash,
          method_eh: createMethodEntryHash,
        };

        const runMethodOutput2: Assessment = await callZomeAlice(
          "sensemaker",
          "run_method",
          runMethodInput2,
          true
        );
        t.ok(runMethodOutput2);

        const runMethodInput3 = {
          resource_eh: createPostEntryHash3,
          resource_def_eh: createResourceDefEntryHash,
          method_eh: createMethodEntryHash,
        };

        const runMethodOutput3: Assessment = await callZomeAlice(
          "sensemaker",
          "run_method",
          runMethodInput3,
          true
        );
        t.ok(runMethodOutput3);

        await pause(pauseDuration);

        const objectiveAssessment: Assessment = {
          value: {
            Integer:
              (createP1Assessment.value as RangeValueInteger).Integer +
              (createP1Assessment2.value as RangeValueInteger).Integer,
          },
          dimension_eh: createObjectiveDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
          author: alice_agent_key,
          timestamp: runMethodOutput.timestamp,
        };
        t.deepEqual(
          objectiveAssessment,
          runMethodOutput
        );

        const objectiveAssessment2: Assessment = {
          value: {
            Integer:
              (createP2Assessment.value as RangeValueInteger).Integer +
              (createP2Assessment2.value as RangeValueInteger).Integer,
          },
          dimension_eh: createObjectiveDimensionEntryHash,
          resource_eh: createPostEntryHash2,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
          author: alice_agent_key,
          timestamp: runMethodOutput2.timestamp,
        };
        t.deepEqual(
          objectiveAssessment2,
          runMethodOutput2
        );

        const objectiveAssessment3: Assessment = {
          value: {
            Integer:
              (createP3Assessment.value as RangeValueInteger).Integer +
              (createP3Assessment2.value as RangeValueInteger).Integer,
          },
          dimension_eh: createObjectiveDimensionEntryHash,
          resource_eh: createPostEntryHash3,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
          author: alice_agent_key,
          timestamp: runMethodOutput3.timestamp,
        };
        t.deepEqual(
          objectiveAssessment3,
          runMethodOutput3
        );

        // create context and threshold
        const threshold = {
          dimension_eh: createObjectiveDimensionEntryHash,
          kind: { GreaterThan: null },
          value: { Integer: 5 },
        };
        const threshold2 = {
          dimension_eh: createObjectiveDimensionEntryHash,
          kind: { GreaterThan: null },
          value: { Float: 5.0 },
        };
        const culturalContext = {
          name: "more than 5 total likeness, biggest to smallest",
          resource_def_eh: createResourceDefEntryHash,
          thresholds: [threshold],
          order_by: [[createObjectiveDimensionEntryHash, { Biggest: null }]], // DimensionEh
        };

        const createContextEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_cultural_context",
          culturalContext,
          true
        );
        t.ok(createContextEntryHash);

        const culturalContext2 = {
          name: "more than 5 total likeness, smallest to biggest",
          resource_def_eh: createResourceDefEntryHash,
          thresholds: [threshold],
          order_by: [[createObjectiveDimensionEntryHash, { Smallest: null }]], // DimensionEh
        };

        const createContextEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_cultural_context",
          culturalContext2,
          true
        );
        t.ok(createContextEntryHash2);

        const culturalContext3 = {
          name: "float threshold",
          resource_def_eh: createResourceDefEntryHash,
          thresholds: [threshold2],
          order_by: [[createObjectiveDimensionEntryHash, { Smallest: null }]], // DimensionEh
        };

        const createContextEntryHash3: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_cultural_context",
          culturalContext3,
          true
        );
        t.ok(createContextEntryHash3);
        await pause(pauseDuration);

        const readCulturalContext: Record = await callZomeBob(
          "sensemaker",
          "get_cultural_context",
          createContextEntryHash,
          true
        );
        t.deepEqual(
          culturalContext,
          decode((readCulturalContext.entry as any).Present.entry) as any
        );

        const contextResultInput = {
          resource_ehs: [
            createPostEntryHash,
            createPostEntryHash2,
            createPostEntryHash3,
          ],
          context_eh: createContextEntryHash,
          can_publish_result: false,
        };

        const contextResultInput2 = {
          resource_ehs: [
            createPostEntryHash,
            createPostEntryHash2,
            createPostEntryHash3,
          ],
          context_eh: createContextEntryHash2,
          can_publish_result: false,
        };
        const contextResultInput3 = {
          resource_ehs: [
            createPostEntryHash,
            createPostEntryHash2,
            createPostEntryHash3,
          ],
          context_eh: createContextEntryHash3,
          can_publish_result: false,
        };

        const contextResultOutput: [any] = await callZomeAlice(
          "sensemaker",
          "compute_context",
          contextResultInput,
          true
        );

        t.deepEqual(contextResultOutput.length, 2);
        t.deepEqual(contextResultOutput, [
          createPostEntryHash,
          createPostEntryHash2,
        ]);

        const contextResultOutput2: [any] = await callZomeAlice(
          "sensemaker",
          "compute_context",
          contextResultInput2,
          true
        );
        t.deepEqual(contextResultOutput2.length, 2);
        t.deepEqual(contextResultOutput2, [
          createPostEntryHash2,
          createPostEntryHash,
        ]);

        // try comparing incompatible types
        try {
          const contextResultOutput3: [any] = await callZomeAlice(
            "sensemaker",
            "compute_context",
            contextResultInput3,
            true
          );
          // this zome call should fail
          t.ok(null);
        } catch (e) {
          const expectedError = {
            type: "error",
            data: {
              type: "ribosome_error",
              data: 'Wasm runtime error while working with Ribosome: RuntimeError: WasmError { file: "dnas/sensemaker/zomes/integrity/sensemaker/src/range.rs", line: 46, error: Guest("incompatible range types for threshold comparison") }',
            },
          };
          t.deepEqual(expectedError, e);
        }

        // fetch all assessments
        const allAssessments: Array<Assessment> = await callZomeAlice(
          "sensemaker",
          "get_all_assessments",
          null,
          true
        );
        console.log('all assessments', allAssessments)
        t.deepEqual(allAssessments.length, 9);

      } catch (e) {
        console.log(e);
        t.ok(null);
      }

      await alice.shutDown();
      await bob.shutDown();
      await cleanAllConductors();
    });
  });
  test("average method computation", async (t) => {
    await runScenario(async (scenario) => {
      const {
        alice,
        bob,
        alice_happs,
        bob_happs,
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
        is_ss = false
      ) => {
        return await alice.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
          zome_name,
          fn_name,
          payload,
          provenance: alice_agent_key,
        });
      };
      const callZomeBob = async (
        zome_name,
        fn_name,
        payload,
        is_ss = false
      ) => {
        return await bob.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_bob : provider_cell_id_bob,
          zome_name,
          fn_name,
          payload,
          provenance: bob_agent_key,
        });
      };
      try {
        const pauseDuration = 1000;
        await scenario.shareAllAgents();
        await pause(pauseDuration);

        // create an entry type in the provider DNA
        const createPost = {
          title: "Intro",
          content: "anger!!",
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost
        );
        // create range for dimension
        const integerRange = {
          name: "10-scale",
          kind: {
            Integer: { min: 0, max: 10 },
          },
        };

        const rangeHash = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange,
          true
        );
        t.ok(rangeHash);

        const createDimension = {
          name: "heat",
          range_eh: rangeHash,
          computed: false,
        };

        const createDimension2 = {
          name: "total_heat",
          range_eh: rangeHash,
          computed: true,
        };

        // Alice creates a dimension
        const createDimensionEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension,
          true
        );
        t.ok(createDimensionEntryHash);

        const createDimensionEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension2,
          true
        );
        t.ok(createDimensionEntryHash2);
        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        const createResourceDef = {
          name: "angryPost",
          //@ts-ignore
          base_types: [
            //@ts-ignore
            { "entry_index": 0, "zome_index": 0, "visibility": { "Public": null } }
          ],
          dimension_ehs: [createDimensionEntryHash, createDimensionEntryHash2],
        };

        // Alice creates a resource type
        const createResourceDefEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_resource_def",
          createResourceDef,
          true
        );
        t.ok(createResourceDefEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Bob gets the created resource type
        // create an assessment on the Post
        const createAssessment: CreateAssessmentInput = {
          value: { Integer: 2 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createAssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createAssessment,
          true
        );
        t.ok(createAssessmentEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // create a second assessment on the Post
        const createAssessment2: CreateAssessmentInput = {
          value: { Integer: 4 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createAssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createAssessment2,
          true
        );
        t.ok(createAssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Alice creates a dimension
        // create a method
        const totalHeatMethod = {
          name: "total_heat_method",
          input_dimension_ehs: [createDimensionEntryHash],
          output_dimension_eh: createDimensionEntryHash2,
          program: { Average: null },
          can_compute_live: false,
          requires_validation: false,
        };

        const createMethodEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_method",
          totalHeatMethod,
          true
        );
        t.ok(createMethodEntryHash);

        await pause(pauseDuration);

        // compute objective dimension
        const runMethodInput = {
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          method_eh: createMethodEntryHash,
        };

        const runMethodOutput: Assessment = await callZomeAlice(
          "sensemaker",
          "run_method",
          runMethodInput,
          true
        );
        t.ok(runMethodOutput);
        console.log('runMethodOutput', runMethodOutput);

        await pause(pauseDuration);

        const objectiveAssessment: Assessment = {
          value: {
            Integer:
              ((createAssessment.value as RangeValueInteger).Integer + (createAssessment2.value as RangeValueInteger).Integer) / 2,
          },
          dimension_eh: createDimensionEntryHash2,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
          author: alice_agent_key,
          timestamp: runMethodOutput.timestamp,
        };
        
        t.deepEqual(
          objectiveAssessment,
          runMethodOutput
        );
      } catch (e) {
        console.log(e);
        t.ok(null);
      }

      await alice.shutDown();
      await bob.shutDown();
      await cleanAllConductors();
    });
  });
  test("average method computation with float", async (t) => {
    await runScenario(async (scenario) => {
      const {
        alice,
        bob,
        alice_happs,
        bob_happs,
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
        is_ss = false
      ) => {
        return await alice.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
          zome_name,
          fn_name,
          payload,
          provenance: alice_agent_key,
        });
      };
      const callZomeBob = async (
        zome_name,
        fn_name,
        payload,
        is_ss = false
      ) => {
        return await bob.appWs().callZome({
          cap_secret: null,
          cell_id: is_ss ? ss_cell_id_bob : provider_cell_id_bob,
          zome_name,
          fn_name,
          payload,
          provenance: bob_agent_key,
        });
      };
      try {
        const pauseDuration = 1000;
        await scenario.shareAllAgents();
        await pause(pauseDuration);

        // create an entry type in the provider DNA
        const createPost = {
          title: "Intro",
          content: "anger!!",
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost
        );
        // create range for dimension
        const integerRange = {
          name: "10-scale",
          kind: {
            Float: { min: 0, max: 10 },
          },
        };

        const rangeHash = await callZomeAlice(
          "sensemaker",
          "create_range",
          integerRange,
          true
        );
        t.ok(rangeHash);

        const createDimension = {
          name: "heat",
          range_eh: rangeHash,
          computed: false,
        };

        const createDimension2 = {
          name: "total_heat",
          range_eh: rangeHash,
          computed: true,
        };

        // Alice creates a dimension
        const createDimensionEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension,
          true
        );
        t.ok(createDimensionEntryHash);

        const createDimensionEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_dimension",
          createDimension2,
          true
        );
        t.ok(createDimensionEntryHash2);
        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        const createResourceDef = {
          name: "angryPost",
          //@ts-ignore
          base_types: [
            //@ts-ignore
            { "entry_index": 0, "zome_index": 0, "visibility": { "Public": null } }
          ],
          dimension_ehs: [createDimensionEntryHash, createDimensionEntryHash2],
        };

        // Alice creates a resource type
        const createResourceDefEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_resource_def",
          createResourceDef,
          true
        );
        t.ok(createResourceDefEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Bob gets the created resource type
        // create an assessment on the Post
        const createAssessment: CreateAssessmentInput = {
          value: { Float: -2 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createAssessmentEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createAssessment,
          true
        );
        t.ok(createAssessmentEntryHash);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // create a second assessment on the Post
        const createAssessment2: CreateAssessmentInput = {
          value: { Float: 3 },
          dimension_eh: createDimensionEntryHash,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
        };

        const createAssessmentEntryHash2: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_assessment",
          createAssessment2,
          true
        );
        t.ok(createAssessmentEntryHash2);

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Alice creates a dimension
        // create a method
        const totalHeatMethod = {
          name: "total_heat_method",
          input_dimension_ehs: [createDimensionEntryHash],
          output_dimension_eh: createDimensionEntryHash2,
          program: { Average: null },
          can_compute_live: false,
          requires_validation: false,
        };

        const createMethodEntryHash: EntryHash = await callZomeAlice(
          "sensemaker",
          "create_method",
          totalHeatMethod,
          true
        );
        t.ok(createMethodEntryHash);

        await pause(pauseDuration);

        // compute objective dimension
        const runMethodInput = {
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          method_eh: createMethodEntryHash,
        };

        const runMethodOutput: Assessment = await callZomeAlice(
          "sensemaker",
          "run_method",
          runMethodInput,
          true
        );
        t.ok(runMethodOutput);
        console.log('runMethodOutput', runMethodOutput);

        await pause(pauseDuration);

        const objectiveAssessment: Assessment = {
          value: {
            Float:
              ((createAssessment.value as RangeValueFloat).Float + (createAssessment2.value as RangeValueFloat).Float) / 2,
          },
          dimension_eh: createDimensionEntryHash2,
          resource_eh: createPostEntryHash,
          resource_def_eh: createResourceDefEntryHash,
          maybe_input_dataset: null,
          author: alice_agent_key,
          timestamp: runMethodOutput.timestamp,
        };
        
        t.deepEqual(
          objectiveAssessment,
          runMethodOutput
        );
      } catch (e) {
        console.log(e);
        t.ok(null);
      }

      await alice.shutDown();
      await bob.shutDown();
      await cleanAllConductors();
    });
  });
};
