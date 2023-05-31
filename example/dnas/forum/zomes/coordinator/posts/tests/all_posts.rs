#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use hdk::prelude::*;
use holochain::test_utils::consistency_10s;
use holochain::{conductor::config::ConductorConfig, sweettest::*};

mod common;
use common::{create_post, sample_post_1};

#[tokio::test(flavor = "multi_thread")]
async fn create_a_post_and_get_all_posts() {
    // Use prebuilt dna file
    let dna_path = std::env::current_dir()
        .unwrap()
        .join("../../../workdir/forum.dna");
    let dna = SweetDnaFile::from_bundle(&dna_path).await.unwrap();

    // Set up conductors
    let mut conductors = SweetConductorBatch::from_config(2, ConductorConfig::default()).await;
    let apps = conductors.setup_app("forum", &[dna]).await.unwrap();
    conductors.exchange_peer_info().await;

    let ((alice,), (bobbo,)) = apps.into_tuples();
    
    let alice_zome = alice.zome("posts");
    let bob_zome = bobbo.zome("posts");
    
    let sample = sample_post_1(&conductors[0], &alice_zome).await;
    
    // Alice creates a Post
    let record: Record = create_post(&conductors[0], &alice_zome, sample.clone()).await;
    
    consistency_10s([&alice, &bobbo]).await;
    
    let get_records: Vec<Record> = conductors[1]
        .call(&bob_zome, "get_all_posts", ())
        .await;
        
    assert_eq!(get_records.len(), 1);    
    assert_eq!(get_records[0], record);    
}


