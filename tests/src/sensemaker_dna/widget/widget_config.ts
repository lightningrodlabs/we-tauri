import { EntryHash } from "@holochain/client";
import {
  pause,
  runScenario,
  Scenario,
  createConductor,
  addAllAgentsToAllConductors,
  cleanAllConductors,
} from "@holochain/tryorama";
import { AssessmentWidgetBlockConfig } from "@neighbourhoods/client";
import { setUpAliceandBob } from "../sensemaker/neighbourhood";

import pkg from "tape-promise/tape";
const { test } = pkg;

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

        // :SHONK: use provider DNA method to get some entry hash for Resource Def anchors
        const dummyEntryHash: EntryHash = await callZomeAlice(
          "test_provider",
          "create_post",
          { title: 'dummy', content: 'test' },
          false,
        );
        console.log('dummy ResourceDef hash', dummyEntryHash)

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
            type: 'standaloneWidget',
            dimensionEh: dummyEntryHash,
            widgetEh: dummyEntryHash,
          },
          outputAssessmentWidget: {
            type: 'appletWidget',
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-widget-component',
          },
        };
        const testWidgetConfig2 = {
          inputAssessmentWidget: {
            type: 'appletWidget',
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-widget-component',
          },
          outputAssessmentWidget: {
            type: 'appletWidget',
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-widget-component',
          },
        };
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
            type: 'appletWidget',
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-widget-component',
          },
          outputAssessmentWidget: {
            type: 'appletWidget',
            dimensionEh: dummyEntryHash,
            appletId: dummyEntryHash,
            componentName: 'test-widget-component',
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
          console.info(e.data)
          //@ts-ignore
          t.ok(e.data.data.match("only the community activator can create this entry"), "only network CA can configure resource widget trays; more complex permission structures planned in future");
        }
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
