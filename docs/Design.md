# we - design

## Overview


![](https://i.imgur.com/ssVZM1E.png)


*We* is composed of two DNA types:

1. The single **lobby** DNA, which is reponsible for...
  * allowing the agent to spawn new instances of *groups* and subsequently invite other agents to join
  * receiving invitations to join a *group* of another agent
2. The **group** clonable DNAs, which are responsible for...
  * storing the agent's user profile for this *group*
  * adding new applets to the *group*



## Lobby DNA

The *lobby* DNA makes use of the **membrane_invitations** zome.

#### membrane_invitaions zome

The [*membrane invitations*](https://github.com/holochain-open-dev/membrane-invitations) zome offers to send "DNA clone recipes" to other agents which they can then use to install an instance of the DNA in their conductor. It contains the required DNA properties of the form

```=typescript
{
    logo_src: String,
    name: String,
}
```

as well as a UUID as Network Seed to ensure the *we group* has it's own private DHT.


## Group DNA

A We *group* is an instance of the *group DNA*.

### applets zome

The applets zome is responsible for installing, joining and querying applets of the given *we* which are stored in the form of `Applet` entries:

```=rust
pub struct Applet {
    pub name: String,
    pub description: String,
    pub logo_src: Option<String>,

    pub devhub_happ_release_hash: EntryHashB64,
    pub gui_file_hash: EntryHashB64,

    pub properties: BTreeMap<String, SerializedBytes>, // Segmented by RoleId
    pub network_seed: BTreeMap<String, Option<String>>,         // Segmented by RoleId
    pub dna_hashes: BTreeMap<String, DnaHashB64>,      // Segmented by RoleId
}
```

### profiles zome

The [profiles zome](https://github.com/holochain-open-dev/profiles) is responsible for storing the profiles of the given *we*. An agent has one overarching profile for each instance of a we which will be used by any applet of that *we*.

### peer_status zome

The [peer_status zome](https://github.com/holochain-open-dev/peer-status) adds functionality to see the online status of other agents within the *we*.
