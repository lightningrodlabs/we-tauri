use ::fixt::prelude::fixt;
use std::collections::BTreeMap;

use applets_integrity::AppletInstance;
use hdk::prelude::holo_hash::*;
use hdk::prelude::*;
use holochain::test_utils::consistency_10s;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

#[tokio::test(flavor = "multi_thread")]
async fn create_applet() {
    // Use prebuilt DNA file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join("../../../workdir/we.dna");
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("we", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (bobbo,)) = apps.into_tuples();

    let alice_zome = alice.zome("applets_coordinator");
    let bob_zome = bobbo.zome("applets_coordinator");

    let applet = AppletInstance {
        custom_name: String::from("custom name"),
        description: String::from("description"),
        logo_src: None,
        devhub_happ_release_hash: fixt!(EntryHash),
        devhub_gui_release_hash: fixt!(EntryHash),

        network_seed: None,
        properties: BTreeMap::new(), // Segmented by RoleId
        dna_hashes: BTreeMap::new(), // Segmented by RoleId
    };

    let _entry_hash: EntryHash = conductors[0]
        .call(&alice_zome, "register_applet_instance", applet)
        .await;

    consistency_10s([&alice, &bobbo]).await;

    let all_applets: Vec<Record> = conductors[1]
        .call(&bob_zome, "get_applets_instances", ())
        .await;

    assert_eq!(all_applets.len(), 1);
}
