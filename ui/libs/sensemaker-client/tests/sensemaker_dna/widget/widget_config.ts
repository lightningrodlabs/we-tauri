import { EntryHash } from "@holochain/client";
import {
  pause,
  runScenario,
  Scenario,
  createConductor,
  addAllAgentsToAllConductors,
  cleanAllConductors,
} from "@holochain/tryorama";
import { AssessmentWidgetBlockConfig } from "#client";
import { setUpAliceandBob } from "../../utils";

import pkg from "tape-promise/tape";
const { test } = pkg;

export default () => {
  test("Test setting and getting widget config block", async (t) => {
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
      const callZomeBob = async (
        zome_name,
        fn_name,
        payload,
        is_ss = true
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

        // :SHONK: use provider DNA method to get some entry hash for Resource Def anchors
        const dummyEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          { title: 'dummy', content: 'test' },
          false,
        );
        // console.log('dummy ResourceDef hash', dummyEntryHash)

        // assert 'no configuration' error
        try {
          let config: AssessmentWidgetBlockConfig = await callZomeAlice(
            "widgets",
            "get_assessment_widget_tray_config",
            { resourceDefEh: dummyEntryHash }
          );
        } catch (e) {
          //@ts-ignore
          t.ok(e.data.data.match("unable to locate widget configuration"), "retrieving unassigned widget tray config returns an error");
        }

        // create a config
        const testWidgetConfig1 = {
          inputAssessmentWidget: {
            type: 'widget',
            dimensionEh: dummyEntryHash,
            widgetRegistryEh: dummyEntryHash,
          },
          outputAssessmentWidget: {
            type: 'widget',
            dimensionEh: dummyEntryHash,
            widgetRegistryEh: dummyEntryHash,
          },
        };
        const testWidgetConfig2 = {
          inputAssessmentWidget: {
            type: 'widget',
            dimensionEh: dummyEntryHash,
            widgetRegistryEh: dummyEntryHash,
          },
          outputAssessmentWidget: {
            type: 'widget',
            dimensionEh: dummyEntryHash,
            widgetRegistryEh: dummyEntryHash,
          },
        };
      //   {
      //     "resourceDefEh": {
      //         "0": 132,
      //         "1": 33,
      //         "2": 36,
      //         "3": 67,
      //         "4": 97,
      //         "5": 86,
      //         "6": 223,
      //         "7": 198,
      //         "8": 126,
      //         "9": 245,
      //         "10": 65,
      //         "11": 113,
      //         "12": 19,
      //         "13": 55,
      //         "14": 180,
      //         "15": 123,
      //         "16": 175,
      //         "17": 82,
      //         "18": 94,
      //         "19": 199,
      //         "20": 21,
      //         "21": 253,
      //         "22": 91,
      //         "23": 252,
      //         "24": 86,
      //         "25": 222,
      //         "26": 246,
      //         "27": 86,
      //         "28": 77,
      //         "29": 215,
      //         "30": 231,
      //         "31": 94,
      //         "32": 240,
      //         "33": 199,
      //         "34": 202,
      //         "35": 68,
      //         "36": 236,
      //         "37": 4,
      //         "38": 150
      //     },
      //     "widgetConfigs": [
      //         {
      //             "resourceDefEh": {
      //                 "0": 132,
      //                 "1": 33,
      //                 "2": 36,
      //                 "3": 67,
      //                 "4": 97,
      //                 "5": 86,
      //                 "6": 223,
      //                 "7": 198,
      //                 "8": 126,
      //                 "9": 245,
      //                 "10": 65,
      //                 "11": 113,
      //                 "12": 19,
      //                 "13": 55,
      //                 "14": 180,
      //                 "15": 123,
      //                 "16": 175,
      //                 "17": 82,
      //                 "18": 94,
      //                 "19": 199,
      //                 "20": 21,
      //                 "21": 253,
      //                 "22": 91,
      //                 "23": 252,
      //                 "24": 86,
      //                 "25": 222,
      //                 "26": 246,
      //                 "27": 86,
      //                 "28": 77,
      //                 "29": 215,
      //                 "30": 231,
      //                 "31": 94,
      //                 "32": 240,
      //                 "33": 199,
      //                 "34": 202,
      //                 "35": 68,
      //                 "36": 236,
      //                 "37": 4,
      //                 "38": 150
      //             },
      //             "inputAssessmentWidget": {
      //                 "type": "widget",
      //                 "dimensionEh": {
      //                     "0": 132,
      //                     "1": 33,
      //                     "2": 36,
      //                     "3": 134,
      //                     "4": 52,
      //                     "5": 187,
      //                     "6": 194,
      //                     "7": 42,
      //                     "8": 53,
      //                     "9": 47,
      //                     "10": 50,
      //                     "11": 34,
      //                     "12": 232,
      //                     "13": 17,
      //                     "14": 31,
      //                     "15": 109,
      //                     "16": 16,
      //                     "17": 209,
      //                     "18": 57,
      //                     "19": 153,
      //                     "20": 182,
      //                     "21": 35,
      //                     "22": 69,
      //                     "23": 112,
      //                     "24": 96,
      //                     "25": 230,
      //                     "26": 36,
      //                     "27": 126,
      //                     "28": 222,
      //                     "29": 20,
      //                     "30": 178,
      //                     "31": 153,
      //                     "32": 104,
      //                     "33": 117,
      //                     "34": 179,
      //                     "35": 36,
      //                     "36": 151,
      //                     "37": 96,
      //                     "38": 136
      //                 },
      //                 "widgetRegistryEh": {
      //                     "0": 132,
      //                     "1": 33,
      //                     "2": 36,
      //                     "3": 193,
      //                     "4": 167,
      //                     "5": 70,
      //                     "6": 69,
      //                     "7": 143,
      //                     "8": 155,
      //                     "9": 37,
      //                     "10": 185,
      //                     "11": 59,
      //                     "12": 234,
      //                     "13": 169,
      //                     "14": 131,
      //                     "15": 154,
      //                     "16": 216,
      //                     "17": 14,
      //                     "18": 118,
      //                     "19": 142,
      //                     "20": 130,
      //                     "21": 92,
      //                     "22": 254,
      //                     "23": 137,
      //                     "24": 102,
      //                     "25": 165,
      //                     "26": 131,
      //                     "27": 100,
      //                     "28": 86,
      //                     "29": 101,
      //                     "30": 150,
      //                     "31": 70,
      //                     "32": 55,
      //                     "33": 230,
      //                     "34": 189,
      //                     "35": 29,
      //                     "36": 95,
      //                     "37": 38,
      //                     "38": 144
      //                 }
      //             },
      //             "outputAssessmentWidget": {
      //                 "type": "widget",
      //                 "dimensionEh": {
      //                     "0": 132,
      //                     "1": 33,
      //                     "2": 36,
      //                     "3": 160,
      //                     "4": 69,
      //                     "5": 46,
      //                     "6": 13,
      //                     "7": 6,
      //                     "8": 32,
      //                     "9": 113,
      //                     "10": 163,
      //                     "11": 77,
      //                     "12": 229,
      //                     "13": 216,
      //                     "14": 35,
      //                     "15": 126,
      //                     "16": 52,
      //                     "17": 57,
      //                     "18": 120,
      //                     "19": 221,
      //                     "20": 206,
      //                     "21": 46,
      //                     "22": 196,
      //                     "23": 158,
      //                     "24": 187,
      //                     "25": 157,
      //                     "26": 104,
      //                     "27": 116,
      //                     "28": 163,
      //                     "29": 68,
      //                     "30": 70,
      //                     "31": 198,
      //                     "32": 157,
      //                     "33": 158,
      //                     "34": 146,
      //                     "35": 249,
      //                     "36": 83,
      //                     "37": 185,
      //                     "38": 90
      //                 },
      //                 "widgetRegistryEh": {
      //                     "0": 132,
      //                     "1": 33,
      //                     "2": 36,
      //                     "3": 193,
      //                     "4": 167,
      //                     "5": 70,
      //                     "6": 69,
      //                     "7": 143,
      //                     "8": 155,
      //                     "9": 37,
      //                     "10": 185,
      //                     "11": 59,
      //                     "12": 234,
      //                     "13": 169,
      //                     "14": 131,
      //                     "15": 154,
      //                     "16": 216,
      //                     "17": 14,
      //                     "18": 118,
      //                     "19": 142,
      //                     "20": 130,
      //                     "21": 92,
      //                     "22": 254,
      //                     "23": 137,
      //                     "24": 102,
      //                     "25": 165,
      //                     "26": 131,
      //                     "27": 100,
      //                     "28": 86,
      //                     "29": 101,
      //                     "30": 150,
      //                     "31": 70,
      //                     "32": 55,
      //                     "33": 230,
      //                     "34": 189,
      //                     "35": 29,
      //                     "36": 95,
      //                     "37": 38,
      //                     "38": 144
      //                 }
      //             }
      //         }
      //     ]
      // }
        const update1 = await callZomeAlice(
          "widgets",
          "set_assessment_widget_tray_config",
          {
            resourceDefEh: dummyEntryHash,
            widgetConfigs: [testWidgetConfig1, testWidgetConfig2],
          }
        );
        t.ok(update1, "creating a new tray config succeeds");
        await pause(pauseDuration);

        // read config back out & check for correctness
        const configCheck1: AssessmentWidgetBlockConfig[] = await callZomeBob(
          "widgets",
          "get_assessment_widget_tray_config",
          { resourceDefEh: dummyEntryHash }
        );
        t.deepEqual(configCheck1, [testWidgetConfig1, testWidgetConfig2], "tray config retrievable by other agent");

        // swap the configs
        const update2: EntryHash[] = await callZomeAlice(
          "widgets",
          "set_assessment_widget_tray_config",
          {
            resourceDefEh: dummyEntryHash,
            widgetConfigs: [testWidgetConfig2, testWidgetConfig1],
          }
        );
        t.ok(update2, "updating tray config with a new ordering succeeds");
        console.info('AssessmentWidgetBlockConfig hashes: ', update2);
        await pause(pauseDuration);

        // read config back out & check for correctness
        const configCheck2: AssessmentWidgetBlockConfig[] = await callZomeAlice(
          "widgets",
          "get_assessment_widget_tray_config",
          { resourceDefEh: dummyEntryHash }
        );
        t.deepEqual(configCheck2, [testWidgetConfig2, testWidgetConfig1], "tray config reordering succeeded");

        // create a new widget config and replace one of the prior ones with it
        const testWidgetConfig1b = {
          inputAssessmentWidget: {
            type: 'widget',
            dimensionEh: dummyEntryHash,
            widgetRegistryEh: dummyEntryHash,
          },
          outputAssessmentWidget: {
            type: 'widget',
            dimensionEh: dummyEntryHash,
            widgetRegistryEh: dummyEntryHash,
          },
        };
        const update3: EntryHash[] = await callZomeAlice(
          "widgets",
          "set_assessment_widget_tray_config",
          {
            resourceDefEh: dummyEntryHash,
            widgetConfigs: [testWidgetConfig2, testWidgetConfig1b, testWidgetConfig1],
          }
        );
        t.ok(update3, "updating tray config with a newly inserted widget block succeeds");
        await pause(pauseDuration);

        // read config back out & check for correctness
        const configCheck3: AssessmentWidgetBlockConfig[] = await callZomeBob(
          "widgets",
          "get_assessment_widget_tray_config",
          { resourceDefEh: dummyEntryHash }
        );
        console.log('configCheck3 ====== test', configCheck3, [testWidgetConfig2, testWidgetConfig1b, testWidgetConfig1])
        t.deepEqual(configCheck3, [testWidgetConfig2, testWidgetConfig1b, testWidgetConfig1], "tray config reordering preserved upon injecting blocks");

        // assert 'permission denied' error, only the CA can create
        try {
          let config: AssessmentWidgetBlockConfig = await callZomeBob(
            "widgets",
            "set_assessment_widget_tray_config",
            {
              resourceDefEh: dummyEntryHash,
              widgetConfigs: [testWidgetConfig2, testWidgetConfig1],
            }
          );
        } catch (e) {
          //@ts-ignore
          console.info(e.message)
          //@ts-ignore
          t.ok(e.message.match("only the community activator can create this entry"), "only network CA can configure resource widget trays; more complex permission structures planned in future");
        }
      } catch (e) {
        console.error(e);
        t.ok(null);
      }

      await cleanup();
    });
  });
};
