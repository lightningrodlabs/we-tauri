import { DnaProperties, InstalledAppInfo } from "@holochain/client";
import { AdminApiResponseAppInstalled, Conductor } from "@holochain/tryorama";
import { enableAndGetAgentHapp } from "@holochain/tryorama/lib/common";
import { serializeHash } from "@holochain-open-dev/utils";
import path from 'path'
import { fileURLToPath } from "url";
import { Base64 } from "js-base64";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sensemakerDna = path.join(__dirname, "../../dnas/sensemaker/workdir/sensemaker.dna");
export const testProviderDna = path.join(__dirname, "../../dnas/test_provider/workdir/test_provider_dna.dna");

export const installAgent = async (
    conductor: Conductor,
    agentName: string,
    ca_key?: Uint8Array,
) => {
    let agentsHapps: Array<InstalledAppInfo> = [];
    let agent_key;
    let ss_cell_id;
    let provider_cell_id;
    try {
        const admin = conductor.adminWs();
        let dnaHash_ss: Uint8Array | null;
        let dnaHash_provider: Uint8Array | null;

        console.log(`generating key for: ${agentName}:`);
        agent_key = await admin.generateAgentPubKey();
        dnaHash_ss = await admin.registerDna(
            { path: sensemakerDna, properties: { community_activator: ca_key ? serializeHash(ca_key) : serializeHash(agent_key) } } as any);
        dnaHash_provider = await admin.registerDna(
            { path: testProviderDna });
        let dna_ss = {
            hash: dnaHash_ss!,
            role_id: "sensemaker",
        };
        let dna_provider = {
            hash: dnaHash_provider!,
            role_id: "test_provider_dna",
        };

        const req = {
            installed_app_id: `${agentName}_sensemaker`,
            agent_key,
            dnas: [dna_ss, dna_provider],
        };
        console.log(`installing happ for: ${agentName}`);
        const agentHapp = await admin.installApp(req);
        agentHapp.cell_data.forEach((cell) => {
            ss_cell_id = cell.role_id === "sensemaker" ? cell.cell_id : ss_cell_id;
            provider_cell_id = cell.role_id === "test_provider_dna" ? cell.cell_id : provider_cell_id;
        })
        await admin.enableApp({ installed_app_id: agentHapp.installed_app_id });
        console.log("app installed", agentHapp)
        agentsHapps.push(agentHapp);

    } catch (e) {
        console.log("error has happened in installation: ", e)
    }

    return {
        agentsHapps,
        agent_key,
        ss_cell_id,
        provider_cell_id
    };

};

