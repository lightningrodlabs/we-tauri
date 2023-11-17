import { DnaSource, Record, ActionHash, EntryHash } from "@holochain/client";
import { pause, runScenario, cleanAllConductors, createConductor, addAllAgentsToAllConductors } from "@holochain/tryorama";
import { decode } from '@msgpack/msgpack';
import pkg from 'tape-promise/tape';
import { installAgent } from "../../utils";
import { setUpAliceandBob } from "./neighbourhood";
import { EntryRecord } from "@holochain-open-dev/utils";
const { test } = pkg;

export default () => test("test CA progenitor pattern", async (t) => {
    await runScenario(async scenario => {
        const { alice, bob, cleanup, alice_agent_key, bob_agent_key, ss_cell_id_alice, ss_cell_id_bob, provider_cell_id_alice, provider_cell_id_bob } = await setUpAliceandBob();

        const callZomeAlice = async (zome_name, fn_name, payload, is_ss = false) => {
            return await alice.callZome({
                cap_secret: null,
                cell_id: is_ss ? ss_cell_id_alice : provider_cell_id_alice,
                zome_name,
                fn_name,
                payload,
                provenance: alice_agent_key
            });
        }
        const callZomeBob = async (zome_name, fn_name, payload, is_ss = false) => {
            return await bob.callZome({
                cap_secret: null,
                cell_id: is_ss ? ss_cell_id_bob : provider_cell_id_bob,
                zome_name,
                fn_name,
                payload,
                provenance: bob_agent_key
            });
        }

        const pauseDuration = 1000;

        await scenario.shareAllAgents();
        await pause(pauseDuration)

        // create an entry type in the provider DNA
        const createPost = {
            "title": "Intro",
            "content": "anger!!"
        };
        const createPostEntryHash: EntryHash = await callZomeAlice(
            "test_provider",
            "create_post",
            createPost,
        );

        await pause(pauseDuration);

        const readPostOutput: Record = await callZomeBob(
            "test_provider",
            "get_post",
            createPostEntryHash
        );

        // create range for dimension
        const integerRange = {
            "name": "10-scale",
            "kind": {
                "Integer": { "min": 0, "max": 10 }
            },
        };

        const rangeRecord = await callZomeAlice(
            "sensemaker",
            "create_range",
            integerRange,
            true
        );
        
        const rangeHash = new EntryRecord<Range>(rangeRecord).entryHash;
        t.ok(rangeHash);

        const createDimension = {
            "name": "likeness",
            "range_eh": rangeHash,
            "computed": false
        }

        // Alice creates a dimension
        const createDimensionRecord: Record = await callZomeAlice(
            "sensemaker",
            "create_dimension",
            createDimension,
            true
        )
        const createDimensionEntryHash = new EntryRecord<Range>(createDimensionRecord).entryHash;

        // Bob creates a dimension but fails
        try {
            await callZomeBob(
                "sensemaker",
                "create_dimension",
                createDimension,
                true
            )
        } catch (e) {
            t.deepEqual(e, {
                type: "error",
                data: {
                    type: "internal_error",
                    data: "Source chain error: InvalidCommit error: only the community activator can create this entry",
                },
            });
        }

        const createResourceDef = {
            "name": "angryPost",
            //@ts-ignore
            "base_types": [readPostOutput.signed_action.hashed.content.entry_type.App],
            "dimension_ehs": [createDimensionEntryHash],
        }

        // Alice creates a resource type
        const createResourceDefRecord: Record = await callZomeAlice(
            "sensemaker",
            "create_resource_def",
            createResourceDef,
            true
        );
        const createResourceDefEntryHash = new EntryRecord<Range>(createResourceDefRecord).entryHash;

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Bob creates a resource type but fails
        try {
            await callZomeBob(
                "sensemaker",
                "create_resource_def",
                createResourceDef,
                true
            );
        } catch (e) {
            t.deepEqual(e, {
                type: "error",
                data: {
                    type: "internal_error",
                    data: "Source chain error: InvalidCommit error: only the community activator can create this entry",
                },
            });
        }

        // Wait for the created entry to be propagated to the other node.
        await pause(pauseDuration);

        // Alice creates a method
        const totalLikenessMethod = {
            "name": "total_likeness_method",
            "input_dimension_ehs": [createDimensionEntryHash],
            "output_dimension_eh": createDimensionEntryHash,
            "program": { "Sum": null },
            "can_compute_live": false,
            "requires_validation": false,
        }

        const createMethodRecord: Record = await callZomeAlice(
            "sensemaker",
            "create_method",
            totalLikenessMethod,
            true
        )
        const createMethodEntryHash = new EntryRecord<Range>(createMethodRecord).entryHash;

        // bob creates a method but fails
        try {
            await callZomeBob(
                "sensemaker",
                "create_method",
                totalLikenessMethod,
                true
            )
        } catch (e) {
            t.deepEqual(e, {
                type: "error",
                data: {
                    type: "internal_error",
                    data: "Source chain error: InvalidCommit error: only the community activator can create this entry",
                },
            });

            const threshold = {
                "dimension_eh": createDimensionEntryHash,
                "kind": { "Equal": null },
                "value": { "Integer": 5 },
            }
            const culturalContext = {
                "name": "testcontext",
                "resource_def_eh": createResourceDefEntryHash,
                "thresholds": [threshold],
                "order_by": [[createDimensionEntryHash, { "Biggest": null }]], // DimensionEh
            }
            try {
                await callZomeBob(
                    "sensemaker",
                    "create_cultural_context",
                    culturalContext,
                    true
                )
            } catch (e) {
                t.deepEqual(e, {
                    type: "error",
                    data: {
                        type: "internal_error",
                        data: "Source chain error: InvalidCommit error: only the community activator can create this entry",
                    },
                });
            }
            await pause(100)
        }
        await cleanup();
    })
})
