# we - design

## Overview


![](https://i.imgur.com/ssVZM1E.png)


*We* is composed of a "we lobby" as well as "we groups".

The **we lobby** is reponsible for...
* keeping track of all the *we groups* the agent is part of
* allowing the agent to spawn new instances of *we groups* and subsequently invite other agents to join
* receiving invitations to join a *we group* of another agent

The **we groups** are responsible to...
* store the agent's user profile for this *we group*
* allow adding new applets to the *we group*
* keep track of all the applets of the given *we group* and store their respective UI's



## We lobby

The *we lobby* makes use of the **membrane_invitations** zome within the **lobby DNA**.

### lobby DNA
#### membrane_invitaions zome

The [*membrane invitations*](https://github.com/holochain-open-dev/membrane-invitations) zome offers to send "DNA clone recipes" to other agents which they can then use to install an instance of the DNA in their conductor. It will amongst others contain the required DNA properties of the form

```=typescript
{
    logo_src: String,
    name: String,
    timestamp: u64,
}
```
as well as a UUID to ensure the *we group* has it's own private DHT.


## We group

A *we group* only consits of an instance of the *we DNA*.

### we DNA

#### we zome

The *we zome*  provides functionalities to retrieve information about the given we, i.e. its DNA properties (see mambrane_invitations zome above) as well as to send and recieve signals about newly added applets.

#### applets zome

The applets zome is responsible for installing, joining and querying applets of the given *we* which are stored in the form of `Applet` entries:

```=rust
pub struct Applet {
    pub name: String,
    pub description: String,
    pub logo_src: Option<String>,

    pub devhub_happ_release_hash: EntryHashB64,
    pub gui_file_hash: EntryHashB64,

    pub properties: BTreeMap<String, SerializedBytes>, // Segmented by RoleId
    pub uid: BTreeMap<String, Option<String>>,         // Segmented by RoleId
    pub dna_hashes: BTreeMap<String, DnaHashB64>,      // Segmented by RoleId
}
```

Furthermore it is storing the GUI's of the applets in the agent's source chain as a private entries for offline retrieval at any time:
```=rust
pub struct AppletGui(SerializedBytes);
```




#### profiles zome

The [profiles zome](https://github.com/holochain-open-dev/profiles) is responsible for storing the profiles of the given *we*. An agent has one overarching profile for each instance of a we which will be used by any applet of that we.

#### peer_status zome

The [peer_status zome](https://github.com/holochain-open-dev/peer-status) adds functionality to see the online status of other agents within the we.





