use ::fixt::prelude::fixt;
use std::collections::BTreeMap;

use group_integrity::Applet;
use hdk::prelude::holo_hash::*;
use hdk::prelude::*;
use holochain::test_utils::consistency_10s;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

#[tokio::test(flavor = "multi_thread")]
async fn create_applet() {
    // Use prebuilt DNA file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join("../../../workdir/group.dna");
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("we", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (bobbo,)) = apps.into_tuples();

    let alice_zome = alice.zome("group");
    let bob_zome = bobbo.zome("group");

    let applet = Applet {
        custom_name: String::from("custom name"),
        description: String::from("description"),
        appstore_app_hash: fixt!(ActionHash),

        devhub_dna_hash: fixt!(DnaHash),
        devhub_happ_release_hash: fixt!(EntryHash),
        devhub_gui_release_hash: fixt!(EntryHash),

        network_seed: None,
        properties: BTreeMap::new(), // Segmented by RoleId
    };

    let _entry_hash: EntryHash = conductors[0]
        .call(&alice_zome, "register_applet", applet)
        .await;

    consistency_10s([&alice, &bobbo]).await;

    let all_applets: Vec<EntryHash> = conductors[1].call(&bob_zome, "get_applets", ()).await;

    assert_eq!(all_applets.len(), 1);
}
