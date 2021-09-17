import { Orchestrator, Config, InstallAgentsHapps } from '@holochain/tryorama'
import path from 'path'
import * as _ from 'lodash'
import { RETRY_DELAY, RETRY_COUNT, localConductorConfig, networkedConductorConfig, installAgents, awaitIntegration, delay } from './common'
import { Base64 } from "js-base64";

function serializeHash(hash: Uint8Array): string {
  return `u${Base64.fromUint8Array(hash, true)}`;
}
export default async (orchestrator) => {

  orchestrator.registerScenario('we basic tests', async (s, t) => {
    // Declare two players using the previously specified config, nicknaming them "alice" and "bob"
    // note that the first argument to players is just an array conductor configs that that will
    // be used to spin up the conductor processes which are returned in a matching array.
    const [a_and_b_conductor] = await s.players([localConductorConfig])

    // install your happs into the conductors and destructuring the returned happ data using the same
    // array structure as you created in your installation array.
    let [alice_we_happ/*, bobbo_we_happ*/] = await installAgents(a_and_b_conductor,  ["alice"/*, 'bobbo'*/])
    const [alice_we] = alice_we_happ.cells
//    const [bobbo_we] = bobbo_we_happ.cells


    // Create a game
    let game1 = {
      name: "profiles",
      dna_hash: "uhC0kKLh4y743R0WEXBePKiAJJ9Myeg63GMW2MDinP4rU2RQ-okBd",
      ui_url: "http://someurl",
      meta: {}
    };
    const game1_hash = await alice_we.call('hc_zome_we', 'create_game', game1 );
    t.ok(game1_hash)
    console.log("game1_hash", game1_hash);

    const games = await alice_we.call('hc_zome_we', 'get_games', null );
    console.log(games);
    t.deepEqual(games, [{hash: game1_hash, content: game1}]);

  })
}
