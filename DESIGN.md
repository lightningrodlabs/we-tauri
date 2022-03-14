# we

Creating a group coherence with holochain apps

##  Context

A key component of group coherence, is that the members of the group know the "rules of the games" that they are playing together.  Since every Holochain DNA is fundamentally a "rules of a game", we can create a powerful group coherence tool by making it easy to compose DNAs and their UIs inside of a membrane of people.  **We** is a DNA and UI that provides this functionality, along with a pattern on how to declare and share functionality across the sub-DNAs that are composed into the group.

# We hApp: DNAs

## We DNA 

### Zomes

#### we zome
The main zome tracks DNAs that have been added to the group, as well as the members that have joined the group, and enables members to request/get membrane proofs for joining these DNAs.

##### Entry Types

```rust
#[hdk_entry(id = "game" )]
pub struct Game {
    pub ui_file_hash: EntryHashB64,    // From the devhub maybe?
    pub dna_file_hash: EntryHashB64,   // From the devhub maybe?
    pub properties: SerializedBytes,
    pub uid: String,
    pub resulting_dna_hash: DnaHashB64,
}
```

##### Zome calls
 get_games() -> Array<GameInfo>
 get_members() -> Array<AgentPubKeyB64>

#### Profiles zome

Every "we" will have a profiles zome (for now at least) to be able to store the profile information for their users.

# Game DNAs

These are domain specific DNAs (where, mutual-credit, notes).

The main challenge here is the membrane proofs, again. How do we make it so that only members of the "we" can enter?

The simplest answer is: let's have a progenitor in these pluggable DNAs, that can invite people to play the game upon request. These progenitor could also give inviting rights to new participants, so that any participant of the pluggable DNA can invite others.

Question: do we have to force this pattern/membrane onto all the pluggable DNAs?

## UI

The *We* will initially look quite similar to discord, where each DNA is represented on the left hand side as an icon which you click on to switch between them. The assumption is that Pluggable DNAs also have we-compatible bundled UIs that can be installed on the fly, and, possibly even composed with to make mixed user-created UIs, see Compository below.

> The interface that a UI for a game needs to implement is in `ui/libs/we-game`.

## Library of Games

Games will need to follow certain patterns to be compatible with the *We* DNA. This is especially around membranes that we decide for the pluggable DNAs, thus we will need to be able to mark DNAs in the devHub and happStore as *We* components.

## Functional dependencies
TO BE ANSWERED:  How do DNAs know which DNA serves a particular group function, i.e. how do we know how to ask which DNA for profile information?

> For now the game UI receives a simple `WeServices` object with the profiles store in it.

## Nesting of Wes
It should be possible to nest we instances.  However there are questions to be answered around how membranes are delegated, and also about how whether all DNAs must map one-to-one to a we instance, or if some (e.g. profiles) could be accessed by both parent and child We DNAs.

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