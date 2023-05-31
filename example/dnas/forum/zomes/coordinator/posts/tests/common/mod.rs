use hdk::prelude::*;
use holochain::sweettest::*;

use posts_integrity::*;



pub async fn sample_post_1(conductor: &SweetConductor, zome: &SweetZome) -> Post {
    Post {
	  title: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
	  content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.".to_string(),
    }
}

pub async fn sample_post_2(conductor: &SweetConductor, zome: &SweetZome) -> Post {
    Post {
	  title: "Lorem ipsum 2".to_string(),
	  content: "Lorem ipsum 2".to_string(),
    }
}

pub async fn create_post(conductor: &SweetConductor, zome: &SweetZome, post: Post) -> Record {
    let record: Record = conductor
        .call(zome, "create_post", post)
        .await;
    record
}

