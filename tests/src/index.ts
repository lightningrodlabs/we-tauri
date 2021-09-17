import { Orchestrator } from "@holochain/tryorama";
import we from "./we";

let orchestrator = new Orchestrator();
we(orchestrator);
orchestrator.run();
