import { AppEntryDef, EntryHash } from "@holochain/client";
import { cleanAllConductors, pause, runScenario } from "@holochain/tryorama";
//@ts-ignore
import { AppletConfig, AppletConfigInput, ConfigCulturalContext, ConfigMethod, ConfigResourceDef, ConfigThreshold, CulturalContext, Dimension, Method, Range, Threshold } from "@neighbourhoods/sensemaker-lite-types";
import pkg from "tape-promise/tape";

import { setUpAliceandBob } from "./neighbourhood";
const { test } = pkg;

let app_entry_def: AppEntryDef = { entry_index: 0, zome_index: 0, visibility: { Public: null } };
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
                await pause(500);

                const integerRange: Range = {
                    "name": "1-scale",
                    "kind": {
                        "Integer": { "min": 0, "max": 1 }
                    },
                };

                const dimensionName = "importance"
                const dimension: Dimension = {
                    name: dimensionName,
                    range: integerRange,
                    computed: false,
                }
                const dimensionHash: EntryHash = await callZomeAlice(
                    "sensemaker",
                    "create_dimension",
                    dimension,
                    true
                );
                t.ok(dimensionHash);
                console.log('dimension hash', dimensionHash)

                const integerRange2: Range = {
                    name: "1-scale-total",
                    kind: {
                        Integer: { min: 0, max: 1000000 },
                    },
                };

                const objectiveDimension: Dimension = {
                    name: "total_importance",
                    range: integerRange2,
                    computed: true,
                };
                const objectiveDimensionHash: EntryHash = await callZomeAlice(
                    "sensemaker",
                    "create_dimension",
                    objectiveDimension,
                    true
                );
                t.ok(objectiveDimensionHash);

                let app_entry_def: AppEntryDef = { entry_index: 0, zome_index: 0, visibility: { Public: null } };
                // waiting for sensemaker-lite-types to be updated
                // const resourceDef: ResourceDef = {
                const resourceDef: any = {
                    name: "task_item",
                    base_types: [app_entry_def],
                    dimension_ehs: [dimensionHash]
                }

                // waiting for sensemaker-lite-types to be updated
                // const configResourceDef: ConfigResourceDef = {
                const configResourceDef: ConfigResourceDef = {
                    name: resourceDef.name,
                    base_types: resourceDef.base_types,
                    dimensions: [dimension]
                }

                const resourceDefEh: EntryHash = await callZomeAlice(
                    "sensemaker",
                    "create_resource_def",
                    resourceDef,
                    true
                );
                t.ok(resourceDefEh);

                const methodName = "total_importance_method"
                const totalImportanceMethod: Method = {
                    name: methodName,
                    target_resource_def_eh: resourceDefEh,
                    input_dimension_ehs: [dimensionHash],
                    output_dimension_eh: objectiveDimensionHash,
                    program: { Sum: null },
                    can_compute_live: false,
                    must_publish_dataset: false,
                };
                const configMethod: ConfigMethod = {
                    name: totalImportanceMethod.name,
                    target_resource_def: configResourceDef,
                    input_dimensions: [dimension], // check if it's subjective (for now)
                    output_dimension: objectiveDimension,      // check if it's objective
                    program: totalImportanceMethod.program,                 // making enum for now, in design doc it is `AST`
                    can_compute_live: totalImportanceMethod.can_compute_live,
                    must_publish_dataset: totalImportanceMethod.must_publish_dataset,
                }

                const methodEh: EntryHash = await callZomeAlice(
                    "sensemaker",
                    "create_method",
                    totalImportanceMethod,
                    true
                );
                t.ok(methodEh);
                const threshold: Threshold = {
                    dimension_eh: objectiveDimensionHash,
                    kind: { GreaterThan: null },
                    value: { Integer: 0 },
                };
                const configThreshold: ConfigThreshold = {
                    dimension: objectiveDimension,
                    kind: { GreaterThan: null },
                    value: { Integer: 0 },
                };

                const culturalContext: CulturalContext = {
                    name: "most_important_tasks",
                    resource_def_eh: resourceDefEh,
                    thresholds: [threshold],
                    order_by: [[objectiveDimensionHash, { Biggest: null }]], // DimensionEh
                };
                const configCulturalContext: ConfigCulturalContext = {
                    name: culturalContext.name,
                    resource_def: configResourceDef,
                    thresholds: [configThreshold],
                    order_by: [[objectiveDimension, { Biggest: null }]], // DimensionEh
                }

                const contextEh: EntryHash = await callZomeAlice(
                    "sensemaker",
                    "create_cultural_context",
                    culturalContext,
                    true
                );
                t.ok(contextEh);

                // create a config type
                const appletConfig: AppletConfig = {
                    name: "todo",
                    dimensions: {
                        importance: dimensionHash,
                        total_importance: objectiveDimensionHash
                    },
                    resource_defs: { task_item: resourceDefEh },
                    methods: { total_importance_method: methodEh },
                    cultural_contexts: { most_important_tasks: contextEh },
                }
                const appletConfigInput: AppletConfigInput = {
                    name: appletConfig.name,
                    dimensions: [dimension, objectiveDimension],
                    resource_defs: [configResourceDef],
                    methods: [configMethod],
                    cultural_contexts: [configCulturalContext],
                }

                let maybeAppletConfig: any = await callZomeAlice(
                    "sensemaker",
                    "check_if_applet_config_exists",
                    appletConfigInput.name,
                    true
                );
                t.ok(!maybeAppletConfig);

                const returnedAppletConfig: any = await callZomeAlice(
                    "sensemaker",
                    "register_applet",
                    appletConfigInput,
                    true
                );
                console.log("this is the applet config added", returnedAppletConfig);
                t.ok(returnedAppletConfig);
                t.deepEqual(JSON.stringify(returnedAppletConfig), JSON.stringify(appletConfig))

                maybeAppletConfig = await callZomeAlice(
                    "sensemaker",
                    "check_if_applet_config_exists",
                    appletConfigInput.name,
                    true
                );
                t.ok(maybeAppletConfig);
                t.deepEqual(JSON.stringify(maybeAppletConfig), JSON.stringify(appletConfig))
                console.log(maybeAppletConfig)
            } catch (e) {
                console.log(e);
                t.ok(null);
            }

            await alice.shutDown();
            await bob.shutDown();
            await cleanAllConductors();
        });
    });

