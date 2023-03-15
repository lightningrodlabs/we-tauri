import { DnaSource, Record, ActionHash, EntryHash, AppEntryDef, Create } from "@holochain/client";
import {
  pause,
  runScenario,
  Scenario,
  createConductor,
  addAllAgentsToAllConductors,
  cleanAllConductors,
} from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";
import { AppletConfig, Assessment, AssessmentWithDimensionAndResource, CreateAppletConfigInput, CreateAssessmentInput, Method, RangeValueInteger } from "@neighbourhoods/sensemaker-lite-types";
import { ok } from "assert";
import pkg from "tape-promise/tape";
import { installAgent, sampleAppletConfig } from "../../utils";
const { test } = pkg;

interface TestPost {
  title: string;
  content: string;
}

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
  test("test fetching dashboard data", async (t) => {
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
        const pauseDuration = 1000
        await scenario.shareAllAgents();
        await pause(pauseDuration);

        // create an entry type in the provider DNA
        const createPost: TestPost = {
          title: "post 1",
          content: "hey!",
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost
        );
        t.ok(createPostEntryHash);

        const createPost2: TestPost = {
          title: "post 2",
          content: "bye!",
        };
        const createPostEntryHash2: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          createPost2
        );
        t.ok(createPostEntryHash2);

        const createPost3: TestPost = {
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

        let app_entry_def: AppEntryDef = { entry_index: 0, zome_index: 0, visibility: { Public: null } };
        const appletConfigInput = sampleAppletConfig(app_entry_def)
        const createAppletConfigInput: CreateAppletConfigInput = {
          applet_config_input: appletConfigInput,
          role_name: "test_provider_dna",
        }
        const appletConfig: AppletConfig = await callZomeAlice(
          "sensemaker",
          "register_applet",
          createAppletConfigInput,
          true
        );
        t.ok(appletConfig);
        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // create an assessment on the Post
        const createP1Assessment: CreateAssessmentInput = {
          value: { Integer: 4 },
          dimension_eh: appletConfig.dimensions["likeness"],
          resource_eh: createPostEntryHash,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
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
          dimension_eh: appletConfig.dimensions["likeness"],
          resource_eh: createPostEntryHash,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
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
          dimension_eh: appletConfig.dimensions["likeness"],
          resource_eh: createPostEntryHash2,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
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
          dimension_eh: appletConfig.dimensions["likeness"],
          resource_eh: createPostEntryHash2,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
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
          dimension_eh: appletConfig.dimensions["likeness"],
          resource_eh: createPostEntryHash3,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
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
          dimension_eh: appletConfig.dimensions["likeness"],
          resource_eh: createPostEntryHash3,
          resource_def_eh: appletConfig.resource_defs["angryPost"],
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

        // fetch all assessments
        const allAssessments: Array<AssessmentWithDimensionAndResource> = await callZomeAlice(
          "sensemaker",
          "get_all_assessments",
          null,
          true
        );
        console.log('all assessments', allAssessments)
        t.deepEqual(allAssessments.length, 6);
        const allAssessedPosts = allAssessments.map((a) => decode((a.resource!.entry as any).Present.entry) as TestPost)
        t.ok(allAssessedPosts.find((p) => JSON.stringify(p) === JSON.stringify(createPost)))
        t.ok(allAssessedPosts.find((p) => JSON.stringify(p) === JSON.stringify(createPost2)))
        t.ok(allAssessedPosts.find((p) => JSON.stringify(p) === JSON.stringify(createPost3)))

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

