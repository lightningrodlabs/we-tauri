# @lightningrodlabs/we-applet

This package contains the interfaces and contracts that a Holochain app UI needs to implement in order to become a We Applet.

## Implementing the UI for a we applet



### Implementing a most basic applet

```typescript=
import { WeClient } from '@lightningrodlabs/we-applet';

const weClient = await WeClient.connect();

if (
  !weClient.renderInfo.type === "applet-view"
  && !weClient.renderInfo.view.type === "main"
) throw new Error("This Applet only implements the applet main view.");

const appAgentClient = weClient.renderInfo.appletClient;
const profilesClient = weClient.renderInfo.profilesClient;

// Your rendering logic here...

```

### Implementing a full-fletched Applet

