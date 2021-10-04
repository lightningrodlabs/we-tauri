# we

Creating a group coherence with holochain apps

##  Context

A key component of group coherence, is that the members of the group know the "rules of the games" that they are playing together.  Since every Holochain DNA is fundamentally a "rules of a game", we can create a powerful group coherence tool by making it easy to compose DNAs and their UIs inside of a membrane of people.  **We** is a DNA and UI that provides this functionality, along with a pattern on how to declare and share functionality across the sub-DNAs that are composed into the group.

## Zomes

### membrane zome
We have to have a way to determine who gets to join the group.  In this design we delegate that to membrane zome, assuming that there will be different ways to do this.  Some initial options:
    1. no checked membrane, just assume players in the group know the UUID which serves as a sort of secret.
    2. membrane-proof check against an agentPubKey stored as a DNA property to check if they have signed a membrane proof
    3. delegated signing, where there is also a list of delegated approvers who may have also signed the membrane-proof.

This zome is required to add new members to an anchor or provide some mechanism to return a list of current members for the purpose of sending signals to.

#### Zome calls
- get_players() -> HashMap<AgentPubKeyB64, String>

### we zome
The main zome tracks DNAs that have been added to the group, and enables members to request/get membrane proofs for joining these DNAs.

#### Entry Types
``` rust
pub struct Game {
    pub name: String,
    dna_hash: DnaHashB64,
    logo_url: String,
    ui_url: String,
    pub meta: HashMap<String, String>,  // usable by the UI for whatever
}
```
#### Zome calls
 create_game() -> EntryHash
 get_games() -> Array<GameInfo>

## Pluggable DNAs

These are domain specific DNAs (where, syn, mutual-credit, notes).

The main challenge here is the membrane proofs, again. How do we make it so that only members of the "we" can enter?

The simplest answer is: let's have a progenitor in these pluggable DNAs, that can invite people to play the game upon request. These progenitor could also give inviting rights to new participants, so that any participant of the pluggable DNA can invite others.

Question: do we have to force this pattern/membrane onto all the pluggable DNAs?

## UI

The *We* will initially look quite similar to discord, where each DNA is represented on the left hand side as an icon which you click on to switch between them.  The assumption is that Pluggable DNAs also have we-compatible bundled UIs that can be installed on the fly, and, possibly even composed with to make mixed user-created UIs, see Compository below.

## Library of "pluggable DNAs" DNA

Pluggable DNAs will need to follow certain patterns to be compatible with the *We* DNA.  This is especially around membranes that we decide for the pluggable DNAs, thus we will need to be able to mark DNAs in the devHub and happStore as *We* components.

## Functional dependencies
TO BE ANSWERED:  How do DNAs know which DNA serves a particular group function, i.e. how do we know how to ask which DNA for profile information?

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
