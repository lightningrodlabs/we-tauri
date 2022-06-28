# we

Creating a group coherence with holochain apps

## Context

A key component of group coherence, is that the members of the group know the "rules of the applets" that they are playing together. Since every Holochain DNA is fundamentally a "rules of a applet", we can create a powerful group coherence tool by making it easy to compose DNAs and their UIs inside of a membrane of people. **We** is a DNA and UI that provides this functionality, along with a pattern on how to declare and share functionality across the sub-DNAs that are composed into the group.

# We hApp: DNAs


## We DNA

### Zomes

#### membrane_invitations

Responsabilities:

- Tracks invitations to other DNAs (with membrane proof).

#### Entry Types

```rust
#[hdk_entry(id = "dna")]
pub struct CloneDnaRecipe {
    pub original_dna_hash: DnaHashB64,

    pub name: String,
    pub description: String,

    pub properties: SerializedBytes,
    pub uid: Option<String>,

    pub resulting_dna_hash: DnaHashB64,
}
```

##### Zome calls

```rust
fn create_clone_dna_recipe(clone_dna_recipe: CloneDnaRecipe) -> ();

fn invite_to_join(recipe_hash: EntryHashB64, invitee: AgentPubKeyB64, membrane_proof: Option<SerializedBytes>) -> ();

pub struct JoinDnaInvitation {
  clone_dna_recipe_hash: EntryHashB64,
  inviter: AgentPubKeyB64,
  membrane_proof: Option<SerializedBytes>
}
fn get_my_invitations() -> Array<JoinDnaInvitation>
```


#### applets

Responsabilities

- Tracks applets (happs) that have been added to the group.
- Tracks the members that have joined each applet.
- Tracks invitations to those applets (with membrane proof).

##### Entry Types

```rust
#[hdk_entry(id = "applet" )]
pub struct Applet {
    pub name: String,
    pub description: String,
    pub logo_src: String,

    pub devhub_webhapp_hash: EntryHashB64,
    pub devhub_gui_hash: EntryHashB64,                  // This file will be committed to the chain

    pub properties: HashMap<String, SerializedBytes>,   // Segmented by RoleId
    pub uid: HashMap<String, Option<String>>,           // Segmented by RoleId
    pub dna_hashes: HashMap<String, DnaHashB64>,        // Segmented by RoleId

}
```

##### Zome calls

```rust
fn add_applet(applet: Applet) -> ()

fn get_applets() -> Array<Applet>

fn invite_to_play(applet_hash: EntryHashB64, invitee: AgentPubKeyB64, membrane_proofs: HashMap<String, Option<SerializedBytes>>) -> ()

pub struct PlayAppletInvitation {
  applet_hash: EntryHashB64,
  inviter: AgentPubKeyB64,
  membrane_proofs: HashMap<String, Option<SerializedBytes>>
}
fn get_my_invitations_for_applets() -> Array<AgentPubKeyB64>
```

#### we

Responsabilities:

- Tracks the members that have joined the group.
- Tracks the relationship with other "WEs" (nesting, forking, federating, merging, etc.).
  - Every other "WE" is stored as a `CloneDnaRecipe` entry.
- Tracks invitations to those other "WEs" (with membrane proof).

##### Entry Types

##### Zome calls

```rust
// All the zome calls from `membrane_invitations`

fn get_members() -> Array<AgentPubKeyB64>
```

#### Profiles zome

Every "we" will have a profiles zome (for now at least) to be able to store the profile information for their users.



# Applet DNAs

These are domain specific DNAs (where, mutual-credit, notes).

The main challenge here is the membrane proofs, again. How do we make it so that only members of the "we" can enter?

The simplest answer is: let's have a progenitor in these pluggable DNAs, that can invite people to play the applet upon request. These progenitor could also give inviting rights to new participants, so that any participant of the pluggable DNA can invite others.

Question: do we have to force this pattern/membrane onto all the pluggable DNAs?

## UI

The _We_ will initially look quite similar to discord, where each DNA is represented on the left hand side as an icon which you click on to switch between them. The assumption is that Pluggable DNAs also have we-compatible bundled UIs that can be installed on the fly, and, possibly even composed with to make mixed user-created UIs, see Compository below.

> The interface that a UI for a applet needs to implement is in `ui/libs/we-applet`.

## Library of Applets

Applets will need to follow certain patterns to be compatible with the _We_ DNA. This is especially around membranes that we decide for the pluggable DNAs, thus we will need to be able to mark DNAs in the devHub and happStore as _We_ components.

## Functional dependencies

TO BE ANSWERED: How do DNAs know which DNA serves a particular group function, i.e. how do we know how to ask which DNA for profile information?

> For now the applet UI receives a simple `WeServices` object with the profiles store in it.

## Nesting of Wes

It should be possible to nest we instances. However there are questions to be answered around how membranes are delegated, and also about how whether all DNAs must map one-to-one to a we instance, or if some (e.g. profiles) could be accessed by both parent and child We DNAs.

### Compository - Warning: experimental

- A library of composable UI bundles, offering custom elements.
- The compository can offer a `<render-entry entry-hash="adfafsd" dna-hash="dfasdf"></render-entry>` that could potentially render any entry from any of the DNAs inside the We space.

  - With this, a bunch of things become possible, for example:
  - I can develop a "google maps" pluggable DNA.
  - In another DNA, I have a calendar event for the planting of some food forest, and it's happening in a specific place in the neighborhood.
  - In the google maps DNA, I index the calendar event entry, recording the dna hash of the calendar DNA and the entry hash of the event, and also the name of the event.
  - Now, any person looking at the map can see a new thing there, and click on it. The map can now render the information about the event, without the user having to go all the way to the calendar-events DNA.

- Makes it possible for composable UIs to be created using [golden-layout](https://golden-layout.com/) and [grapesjs](https://grapesjs.com/)
- Also, it can offer cross-DNA execution flow implemented with [rete](https://rete.js.org/#/).
- It is mostly already coded.

---

- Calendar Events
- Where
- Notebooks
- SnapMail
- Elemental-chat

- Mutual Credit?

- File-storage?

## Grammatics of social evolution

- Fork:
  - from_we.fork_applet(to_we) -> create a clone of the applet in "from_we" in "to_we"
  - from_we.fork_we() -> a new we with all the applets forked
- Merge
  - from_we.merge_we(to_we)
    - change the "we context" of all applets in "from_we" to "to_we"
- Nest
  - from_we.nest_into(to_we)
- Unnest
  - from_we.unnest_from(to_we)
- Federate

  - from_we.federate_applet(applet, with_we) -> "with_we" has also "applet"

  Input

  - we1
    - chat1
  - we2
    - chat2

  Output

  - we1
    - chat1
    - chatbridge1/token/bidirectionalentry
  - we2
    - chat2
    - chatbridge1/token/bidirectionalentry
