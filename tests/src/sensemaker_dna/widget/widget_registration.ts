import { AssessmentWidgetRegistration, AssessmentWidgetRegistrationUpdateInput } from './../../../../client/src/widgets/widget-registry';
import { AgentPubKey, EntryHash, Record } from "@holochain/client";
import {
  pause,
  runScenario,
  cleanAllConductors,
} from "@holochain/tryorama";


import pkg from "tape-promise/tape";
import { EntryRecord } from "@holochain-open-dev/utils";
import { setUpAliceandBob } from '../../utils';
const { test } = pkg;

export default () => {
  test("Widget registration", async (t) => {
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

        // Test 0: Given no registered widgets Then Alice can read all registered widgets and get an empty array

          const getAll1 : Record[] = await callZomeAlice(
            "widgets",
            "get_assessment_widget_registrations",
            null
          );
          t.deepEqual([], getAll1);

        // Test 1: Alice can create a widget registration entry
          // use provider DNA method to get some entry hash for applet_eh
          const dummyEntryHash: EntryHash = await callZomeAlice(
            "test_provider",
            "create_post",
            { title: 'dummy', content: 'test' },
            false,
          );
          // create range
          const twentyScaleRange = {
            "name": "20-scale",
            "kind": {
              "Integer": { "min": 0, "max": 20 }
            },
          };
          const twentyScaleRangeRecord: Record = await callZomeAlice(
            "sensemaker",
            "create_range",
            twentyScaleRange,
            true
          );
          await pause(pauseDuration);
          const twentyScaleRangeEntryHash = new EntryRecord<Range>(twentyScaleRangeRecord).entryHash;

        const testWidgetRegistration = {
          appletEh: dummyEntryHash,
          widgetKey: 'importance', 
          name: 'Importance Widget',
          rangeEh: twentyScaleRangeEntryHash,
          kind: 'input'
        };
        const widgetRegistrationCreationRecord : Record = await callZomeAlice(
          "widgets",
          "register_assessment_widget",
          testWidgetRegistration,
          true
        );
        t.ok(widgetRegistrationCreationRecord, "create a new assessment widget registration");

        const widgetRegistrationCreationEntryRecord = new EntryRecord<AssessmentWidgetRegistration>(widgetRegistrationCreationRecord);

        // await pause(pauseDuration);
        t.deepEqual(widgetRegistrationCreationEntryRecord.entry.range, twentyScaleRange, "created assessment widget registration with the correct range");

        // Test 2: Given a created registration entry Then Alice can read that widget registration entry

        const get1 = await callZomeAlice(
          "widgets",
          "get_assessment_widget_registration",
          widgetRegistrationCreationEntryRecord.entryHash
        );
        t.ok(get1, "get an assessment widget registration");

        const getWidgetRegistrationEntryRecord = new EntryRecord<AssessmentWidgetRegistration>(get1);
        t.deepEqual(getWidgetRegistrationEntryRecord.entry.range, twentyScaleRange, "got assessment widget registration with the correct range");

        // // Test 3: Given a created registration entry Then Alice can read all registered widgets and get an array of one

        const getAll2 : Record[] = await callZomeAlice(
          "widgets",
          "get_assessment_widget_registrations",
          null
        );
        t.equal(1, getAll2.length);
        const firstRecord = new EntryRecord<AssessmentWidgetRegistration>(getAll2[0]);
        t.deepEqual(firstRecord.entry.range, twentyScaleRange, "got assessment widgets registration with the correct range");


        // Test 4: Given a created registration entry Then Alice can update that widget registration entry

        // const testWidgetRegistrationUpdate : AssessmentWidgetRegistrationUpdateInput = {
        //   assessmentRegistrationEh: widgetRegistrationCreationEntryHash,
        //   assessmentRegistrationUpdate: {
        //     appletEh: dummyEntryHash,
        //     widgetKey: 'total-importance', 
        //     name: 'Importance Widget Updated',
        //     rangeEh: twentyScaleRangeEntryHash,
        //     kind: 'output'
        //   }
        // };
        // const update1 = await callZomeAlice(
        //   "widgets",
        //   "update_assessment_widget_registration",
        //   testWidgetRegistrationUpdate
        // );
        // t.ok(update1, "updated an assessment widget registration");
        // await pause(pauseDuration);

      } catch (e) {
        console.error(e);
        t.ok(null);
      }

      await cleanup();
    });
  });
};
