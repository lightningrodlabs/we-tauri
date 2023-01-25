import { serializeHash } from "@holochain-open-dev/utils";
import { DnaSource, Record, ActionHash, EntryHash, AppEntryDef } from "@holochain/client";
import { cleanAllConductors, pause, runScenario } from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";
import pkg from "tape-promise/tape";
import { setUpAliceandBob } from "./neighbourhood";
const { test } = pkg;

let app_entry_def: AppEntryDef = { entry_index: 0, zome_index: 0, visibility: { Public: null } };
export default () =>
  test("test Sensemaker and Applet Configuration in DNA Property", async (t) => {
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
      } = await setUpAliceandBob(true, app_entry_def);

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

      try {
        await scenario.shareAllAgents();
        await pause(10000);
        // Alice retrieves the Config
        const maybe_sm_config = await callZomeAlice(
          "sensemaker",
          "get_latest_sensemaker_config",
          null,
          true
        );
        t.ok(maybe_sm_config);


        let sm_config = decode(
          (maybe_sm_config.entry as any).Present.entry
        ) as any;

        let neighborhood_name: string = sm_config.neighbourhood;
        let wizard_version: string = sm_config.wizard_version;

        t.equal(neighborhood_name, "Rated Agenda");
        t.equal(wizard_version, "v0.1");

        const maybe_applet_config = await callZomeAlice(
          "sensemaker",
          "check_if_applet_config_exists",
          "sample applet config",
          true
        );
        t.ok(maybe_applet_config);

        console.log(maybe_applet_config);

        let dimension_ehs: EntryHash[] = Object.values(maybe_applet_config.dimensions);
        let resource_ehs: EntryHash[] = Object.values(maybe_applet_config.resource_types);
        let method_ehs: EntryHash[] = Object.values(maybe_applet_config.methods);
        let context_ehs: EntryHash[] = Object.values(maybe_applet_config.cultural_contexts);
        t.equal(dimension_ehs.length, 2);
        t.equal(resource_ehs.length, 1);
        t.equal(method_ehs.length, 1);
        t.equal(context_ehs.length, 2);

        // Alice gets all dimensions created from config
        let dimensions = await Promise.all(
          dimension_ehs.map(async (eh) => {
            return await callZomeAlice("sensemaker", "get_dimension", eh, true);
          })
        );
        console.log("created dimensions", dimensions);
        t.equal(dimensions.length, 2);

        // Alice gets all resources created from config
        let resources = await Promise.all(
          resource_ehs.map(async (eh) => {
            return await callZomeAlice(
              "sensemaker",
              "get_resource_type",
              eh,
              true
            );
          })
        );
        console.log("created resources", resources);
        t.equal(resources.length, 1);

        // Alice gets all methods created from config
        let methods = await Promise.all(
          method_ehs.map(async (eh) => {
            return await callZomeAlice("sensemaker", "get_method", eh, true);
          })
        );
        console.log("created methods", methods);
        t.equal(methods.length, 1);

        // Alice gets all contexts created from config
        let contexts = await Promise.all(
          context_ehs.map(async (eh) => {
            return await callZomeAlice(
              "sensemaker",
              "get_cultural_context",
              eh,
              true
            );
          })
        );
        console.log("created contexts", contexts);
        t.equal(contexts.length, 2);
      } catch (e) {
        console.log(e);
        t.ok(null);
      }

      await alice.shutDown();
      await bob.shutDown();
      await cleanAllConductors();
    });
  });

test("test updating of sensemaker config", async (t) => {
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
    } = await setUpAliceandBob(false, app_entry_def);

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

    try {
      await scenario.shareAllAgents();
      await pause(10000);

      const maybe_sm_config: Record = await callZomeAlice(
        "sensemaker",
        "get_latest_sensemaker_config",
        null,
        true
      );
      t.ok(maybe_sm_config);


      let sm_config_action_hash =
        maybe_sm_config.signed_action.hashed.hash

      const sensemaker_config_update = {
        original_action_hash: sm_config_action_hash,
        updated_sensemaker_config: {
          neighbourhood: "Rated Agenda 2",
          wizard_version: "v0.2",
          community_activator: serializeHash(alice_agent_key),
        }
      }

      const updated_config_ah = await callZomeAlice(
        "sensemaker",
        "update_sensemaker_config",
        sensemaker_config_update,
        true
      )
      console.log(updated_config_ah);
      t.ok(updated_config_ah);

      const maybe_updated_sm_config: Record = await callZomeAlice(
        "sensemaker",
        "get_latest_sensemaker_config",
        null,
        true
      );
      let updated_sm_config_action_hash =
        maybe_updated_sm_config.signed_action.hashed.hash
      t.ok(maybe_sm_config);
      t.deepEqual(updated_sm_config_action_hash, updated_config_ah);
    } catch (e) {
      console.log(e);
      t.ok(null);
    }

    await alice.shutDown();
    await bob.shutDown();
    await cleanAllConductors();
  });
});

