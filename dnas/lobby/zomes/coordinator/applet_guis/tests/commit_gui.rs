use ::fixt::prelude::fixt;
use hdk::prelude::*;
use holochain::test_utils::consistency_10s;
use holochain::{conductor::config::ConductorConfig, sweettest::*};
use applet_guis_integrity::{AppletGui};






#[tokio::test(flavor = "multi_thread")]
async fn commit_gui() -> ExternResult<()> {

    // Use prebuilt DNA file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join("../../../workdir/lobby.dna");
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("we", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (bobbo,)) = apps.into_tuples();

    let alice_zome = alice.zome("applet_guis_coordinator");



    let dummy_release_hash = fixt!(EntryHash);

    // query a gui before commiting one --> should return an error
    // let _queried_gui_error: AppletGui =
    //     conductors[1].call(&bob_zome, "query_applet_gui", dummy_release_hash.clone()).await;
    // let expected_error = Err(WasmError::Guest(String::from("No Applet GUI found for the given DevHub hApp release hash.")));
    // assert_eq!(queried_gui_error, expected_error);


    // commit an applet gui and try to retrieve it from the source chain
    let applet_gui = AppletGui {
        devhub_happ_release_hash: dummy_release_hash.clone(),
        gui: SerializedBytes::default(),
    };


    println!("dummy_release_hash: {:?}", dummy_release_hash);

    let _: () = conductors[0]
        .call(&alice_zome, "commit_gui_file", applet_gui.clone())
        .await;

    println!("GUI FILE COMMITED.");
    println!("dummy_release_hash: {:?}", dummy_release_hash);
    consistency_10s([&alice, &bobbo]).await;
    println!("about to call query_applet_gui");

    let queried_gui: AppletGui =
        conductors[0].call(&alice_zome, "query_applet_gui", dummy_release_hash).await;

    assert_eq!(queried_gui.devhub_happ_release_hash, applet_gui.devhub_happ_release_hash.clone());
    assert_eq!(queried_gui.gui, applet_gui.gui);


    Ok(())
}
