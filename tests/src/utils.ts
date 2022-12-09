import {
  AppEntryType,
  InstalledAppInfo,
} from "@holochain/client";
import {
  Conductor,
  createConductor,
} from "@holochain/tryorama";
import {
  addAllAgentsToAllConductors,
} from "@holochain/tryorama/lib/common";
import { serializeHash } from "@holochain-open-dev/utils";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sensemakerDna = path.join(
  __dirname,
  "../../dnas/sensemaker/workdir/sensemaker.dna"
);
export const testProviderDna = path.join(
  __dirname,
  "../../dnas/test_provider/workdir/test_provider_dna.dna"
);

export const installAgent = async (
  conductor: Conductor,
  agentName: string,
  ca_key?: Uint8Array,
  with_config: boolean = false,
  resource_base_type?: any
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

    dnaHash_ss = await admin.registerDna({
      path: sensemakerDna,
      modifiers: {
        properties: {
          community_activator: ca_key
            ? serializeHash(ca_key)
            : serializeHash(agent_key),
          config: with_config ? sampleConfig(resource_base_type!) : null
        },
      },
    } as any)
    dnaHash_provider = await admin.registerDna({ path: testProviderDna });
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
      provider_cell_id =
        cell.role_id === "test_provider_dna" ? cell.cell_id : provider_cell_id;
    });
    await admin.enableApp({ installed_app_id: agentHapp.installed_app_id });
    console.log("app installed", agentHapp);
    agentsHapps.push(agentHapp);
  } catch (e) {
    console.log("error has happened in installation: ", e);
  }

  return {
    agentsHapps,
    agent_key,
    ss_cell_id,
    provider_cell_id,
  };
};

export const sampleConfig = (resource_base_type: AppEntryType) => {
  let config = {
    neighbourhood: "Posting Board",
    wizard_version: "v0.1",
    config_version: "v1-inclusive",
    creator: "John Doe <john@doe.org>",
    //   ranges: [{ name: "10-scale", kind: { Integer: { min: 0, max: 10 } } }],
    dimensions: [
      {
        name: "likeness",
        range: { name: "10-scale", kind: { Integer: { min: 0, max: 10 } } },
        computed: false,
      },
      {
        name: "total_likeness",
        range: {
          name: "10-scale",
          kind: {
            Integer: { min: 0, max: 1000000 },
          },
        },
        computed: true,
      },
    ],
    resources: [
      {
        name: "angryPost",
        base_types: [resource_base_type],
        dimensions: [
          {
            name: "likeness",
            range: { name: "10-scale", kind: { Integer: { min: 0, max: 10 } } },
            computed: false,
          },
        ],
      },
    ],
    methods: [
      {
        name: "total_likeness_method",
        target_resource_type: {
          name: "angryPost",
          base_types: [resource_base_type],
          dimensions: [
            {
              name: "likeness",
              range: {
                name: "10-scale",
                kind: { Integer: { min: 0, max: 10 } },
              },
              computed: false,
            },
          ],
        },
        input_dimensions: [
          {
            name: "likeness",
            range: { name: "10-scale", kind: { Integer: { min: 0, max: 10 } } },
            computed: false,
          },
        ],
        output_dimension: {
          name: "total_likeness",
          range: {
            name: "10-scale",
            kind: {
              Integer: { min: 0, max: 1000000 },
            },
          },
          computed: true,
        },
        program: { Sum: null },
        can_compute_live: false,
        must_publish_dataset: false,
      },
    ],
    contexts: [
      {
        name: "more than 5 total likeness, biggest to smallest",
        resource_type: {
          name: "angryPost",
          base_types: [resource_base_type],
          dimensions: [
            {
              name: "likeness",
              range: {
                name: "10-scale",
                kind: { Integer: { min: 0, max: 10 } },
              },
              computed: false,
            },
          ],
        },
        thresholds: [
          {
            dimension_eh: {
              name: "total_likeness",
              range: {
                name: "10-scale",
                kind: {
                  Integer: { min: 0, max: 1000000 },
                },
              },
              computed: true,
            },
            kind: { GreaterThan: null },
            value: { Integer: 5 },
          },
        ],
        order_by: [
          [
            {
              name: "total_likeness",
              range: {
                name: "10-scale",
                kind: {
                  Integer: { min: 0, max: 1000000 },
                },
              },
              computed: true,
            },
            { Biggest: null }, // DimensionEh
          ],
        ],
      },
      {
        name: "more than 5 total likeness, smallest to biggest",
        resource_type_eh: {
          name: "angryPost",
          base_types: [resource_base_type],
          dimensions: [
            {
              name: "likeness",
              range: {
                name: "10-scale",
                kind: { Integer: { min: 0, max: 10 } },
              },
              computed: false,
            },
          ],
        },
        thresholds: [
          {
            dimension_eh: {
              name: "total_likeness",
              range: {
                name: "10-scale",
                kind: {
                  Integer: { min: 0, max: 1000000 },
                },
              },
              computed: true,
            },
            kind: { GreaterThan: null },
            value: { Integer: 5 },
          },
        ],
        order_by: [
          [
            {
              name: "total_likeness",
              range: {
                name: "10-scale",
                kind: {
                  Integer: { min: 0, max: 1000000 },
                },
              },
              computed: true,
            },
            { Smallest: null },
          ],
        ], // DimensionEh
      },
    ],
  };
  return config;
};
