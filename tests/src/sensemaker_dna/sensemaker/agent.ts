import { DnaSource, Record, ActionHash, EntryHash, AppEntryDef, Create, AgentPubKey } from "@holochain/client";
import {
  pause,
  runScenario,
  Scenario,
  createConductor,
  addAllAgentsToAllConductors,
  cleanAllConductors,
} from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";
import { AppletConfig, Assessment, AssessmentWithDimensionAndResource, CreateAppletConfigInput, CreateAssessmentInput, Method, RangeValueInteger } from "@neighbourhoods/client";
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
  test("test registering agent", async (t) => {
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
        await pause(pauseDuration*2);

        let agents: Array<AgentPubKey> = await callZomeAlice(
          "sensemaker",
          "get_all_agents",
          null,
          true
        );
        t.ok(agents);
        t.equal(agents.length, 1);
        console.log("agents", agents);
        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        agents = await callZomeBob(
          "sensemaker",
          "get_all_agents",
          null,
          true
        );
        t.ok(agents);
        t.equal(agents.length, 2);
        console.log("agents", agents);
        await pause(pauseDuration);
        
        agents = await callZomeAlice(
          "sensemaker",
          "get_all_agents",
          null,
          true
        );
        t.ok(agents);
        t.equal(agents.length, 2);
        console.log("agents", agents);
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
