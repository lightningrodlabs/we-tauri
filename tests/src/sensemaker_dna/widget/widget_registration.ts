import { AgentPubKey, EntryHash } from "@holochain/client";
import {
  pause,
  runScenario,
  cleanAllConductors,
} from "@holochain/tryorama";
import { AssessmentWidgetBlockConfig } from "@neighbourhoods/client";
import { setUpAliceandBob } from "../sensemaker/neighbourhood";

import pkg from "tape-promise/tape";
const { test } = pkg;

export default () => {
  test.only("test registering agent", async (t) => {
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
        is_ss = true
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
        is_ss = true
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
        t.equal(agents.length, 0);
        console.log("agents", agents);

      } catch (e) {
        console.error(e);
        t.ok(null);
      }

      await alice.shutDown();
      await bob.shutDown();
      await cleanAllConductors();
    });
  });
};
