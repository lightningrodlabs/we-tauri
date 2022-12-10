import { DnaSource, Record, ActionHash, EntryHash } from "@holochain/client";
import { cleanAllConductors, pause, runScenario } from "@holochain/tryorama";
import { decode } from "@msgpack/msgpack";
import pkg from "tape-promise/tape";
import { setUpAliceandBob } from "./neighbourhood";
const { test } = pkg;

let app_entry_type = { id: 0, zome_id: 0, visibility: { Public: null } };
export default () =>
    test("test Sensemaker Configuration", async (t) => {
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
            } = await setUpAliceandBob(true, app_entry_type);

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
                const config_record: Record[] = await callZomeAlice(
                    "sensemaker",
                    "get_configs",
                    null,
                    true
                );
                t.equal(config_record.length, 1);


                let config = decode((config_record[0].entry as any).Present.entry) as any;
                let dimension_ehs: EntryHash[] = config.dimensions;
                let resource_ehs: EntryHash[] = config.resources;
                let method_ehs: EntryHash[] = config.methods;
                let context_ehs: EntryHash[] = config.contexts;

                t.equal(dimension_ehs.length, 2);
                t.equal(resource_ehs.length, 1);
                t.equal(method_ehs.length, 1);
                t.equal(context_ehs.length, 2);

                // Alice gets all dimensions created from config
                let dimensions = await Promise.all(dimension_ehs.map(async (eh) => {
                    return await callZomeAlice(
                        "sensemaker",
                        "get_dimension",
                        eh,
                        true
                    );
                }));
                console.log("created dimensions", dimensions)
                t.equal(dimensions.length, 2);

                // Alice gets all resources created from config
                let resources = await Promise.all(resource_ehs.map(async (eh) => {
                    return await callZomeAlice(
                        "sensemaker",
                        "get_resource_type",
                        eh,
                        true
                    );
                }));
                console.log("created resources", resources)
                t.equal(resources.length, 1);


                // Alice gets all methods created from config
                let methods = await Promise.all(method_ehs.map(async (eh) => {
                    return await callZomeAlice(
                        "sensemaker",
                        "get_method",
                        eh,
                        true
                    );
                }));
                console.log("created methods", methods)
                t.equal(methods.length, 1);


                // Alice gets all contexts created from config
                let contexts = await Promise.all(context_ehs.map(async (eh) => {
                    return await callZomeAlice(
                        "sensemaker",
                        "get_cultural_context",
                        eh,
                        true
                    );
                }));
                console.log("created contexts", contexts)
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
