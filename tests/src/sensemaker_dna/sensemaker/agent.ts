import { DnaSource, Record, ActionHash, EntryHash, AppEntryDef, Create, AgentPubKey, encodeHashToBase64 } from "@holochain/client";
import {
  pause,
  runScenario,
  Scenario,
  createConductor,
  addAllAgentsToAllConductors,
  cleanAllConductors,
} from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";
import { AppletConfig, Assessment, CreateAssessmentInput, Method, RangeValueInteger } from "@neighbourhoods/client";
import { ok } from "assert";
import pkg from "tape-promise/tape";
import { installAgent, sampleAppletConfig } from "../../utils";
import { setUpAliceandBob } from './neighbourhood';
const { test } = pkg;

interface TestPost {
  title: string;
  content: string;
}

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
        is_ss = false
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
      const callZomeBob = async (
        zome_name,
        fn_name,
        payload,
        is_ss = false
      ) => {
        return await bob.callZome({
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
        t.equal(agents.length, 0);
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
        t.equal(agents.length, 1);
        t.equal(encodeHashToBase64(agents[0]), encodeHashToBase64(alice_agent_key));
        console.log("agents", agents);
        await pause(pauseDuration);

        agents = await callZomeAlice(
          "sensemaker",
          "get_all_agents",
          null,
          true
        );
        t.ok(agents);
        t.equal(agents.length, 1);
        t.equal(encodeHashToBase64(agents[0]), encodeHashToBase64(bob_agent_key));
        console.log("agents", agents);
      } catch (e) {
        console.log(e);
        t.ok(null);
      }

      await cleanup();
    });
  });
};
