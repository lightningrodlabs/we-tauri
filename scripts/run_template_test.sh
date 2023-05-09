#!/usr/bin/bash
# Run this inside `nix develop`
set -e

DIR=$(pwd)

cd /tmp
rm -rf forum-applet

hc-scaffold web-app forum-applet --setup-nix true --template app+applet --templates-path ${DIR}/.templates

cd forum-applet

nix develop --command bash -c "
set -e
hc-scaffold dna forum 

hc-scaffold zome posts --integrity dnas/forum/zomes/integrity/ --coordinator dnas/forum/zomes/coordinator/
hc-scaffold entry-type post --reference-entry-hash false --crud crud --link-from-original-to-each-update true --fields title:String:TextField,needs:Vec\<String\>:TextField
hc-scaffold entry-type comment --reference-entry-hash false --crud crud --link-from-original-to-each-update false --fields post_hash:ActionHash::Post
hc-scaffold entry-type like --reference-entry-hash false --crud crd --fields like_hash:Option\<ActionHash\>::Like,image_hash:EntryHash:Image,agent:AgentPubKey:SearchAgent
hc-scaffold entry-type certificate --reference-entry-hash true --crud cr --fields post_hash:ActionHash::Post,agent:AgentPubKey::certified,certifications_hashes:Vec\<EntryHash\>::Certificate,certificate_type:Enum::CertificateType:TypeOne.TypeTwo,dna_hash:DnaHash

hc-scaffold collection global all_posts post 
hc-scaffold collection by-author posts_by_author post
hc-scaffold collection global all_posts_entry_hash post:EntryHash
hc-scaffold collection by-author posts_by_author_entry_hash post:EntryHash

hc-scaffold link-type post like --delete true --bidireccional false
hc-scaffold link-type comment like:EntryHash --delete true --bidireccional true
hc-scaffold link-type certificate:EntryHash like --delete false --bidireccional false
hc-scaffold link-type agent:creator post:EntryHash --delete false --bidireccional true

npm i

npm t

npm run package:app
npm run package:applet
"

