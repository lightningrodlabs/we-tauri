import {
  AppEntryDef,
  AppInfo,
  InstallAppRequest,
  encodeHashToBase64,
  CellInfo,
  ProvisionedCell,
  CellType
} from "@holochain/client";
import {
  Conductor,
} from "@holochain/tryorama";
import { AppletConfigInput } from "@neighbourhoods/client";
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
  let agentsHapps: Array<any> = [];
  let agent_key;
  let ss_cell_id;
  let provider_cell_id;
  try {
    const admin = conductor.adminWs();

    console.log(`generating key for: ${agentName}:`);
    agent_key = await admin.generateAgentPubKey();

    const req: InstallAppRequest = {
      installed_app_id: `${agentName}_sensemaker`,
      agent_key,
      //@ts-ignore
      membrane_proofs: {},
      bundle: {
        manifest: {
          manifest_version: "1",
          name: "sensemaker_happ",
          description: "",
          roles: [{
            name: "sensemaker_dna",
            provisioning: {
              //@ts-ignore
              strategy: 'create',
              deferred: false,
            },
            dna: {
              //@ts-ignore
              modifiers: {
                properties: {
                  sensemaker_config: {
                    neighbourhood: "Rated Agenda",
                    wizard_version: "v0.1",
                    community_activator: ca_key
                      ? encodeHashToBase64(ca_key)
                      : encodeHashToBase64(agent_key),
                  },
                  applet_configs: with_config ? [sampleAppletConfig(resource_base_type!)] : [],
                },
              },
              //@ts-ignore
              path: sensemakerDna,
            }
          }, {
            name: "test_provider_dna",
            provisioning: {
              //@ts-ignore
              strategy: 'create',
              deferred: false,
            },
            dna: {
              //@ts-ignore
              path: testProviderDna,
            }
          }],
        },
        resources: {},
      }
    };
    const agentHapp: AppInfo = await admin.installApp(req);
    const ssCellInfo: CellInfo = agentHapp.cell_info["sensemaker_dna"][0]
    ss_cell_id = (CellType.Provisioned in ssCellInfo) ? (ssCellInfo[CellType.Provisioned] as ProvisionedCell).cell_id : ss_cell_id
    const providerCellInfo = agentHapp.cell_info["test_provider_dna"][0]
    provider_cell_id = (CellType.Provisioned in providerCellInfo) ? (providerCellInfo[CellType.Provisioned] as ProvisionedCell).cell_id : provider_cell_id
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

export const sampleAppletConfig = (resource_base_def: AppEntryDef) => {
  let config: AppletConfigInput = {
    name: "sample applet config",
    ranges: [{ name: "10-scale", kind: { Integer: { min: 0, max: 10 } } }, { name: "10-scale", kind: { Integer: { min: 0, max: 1000000 } } }],
    dimensions: [
      {
        name: "likeness",
        range: { name: "10-scale", kind: { Integer: { min: 0, max: 10 } } },
        computed: false,
      },
      {
        name: "total_likeness",
        range: { name: "10-scale", kind: { Integer: { min: 0, max: 1000000 } } },
        computed: true,
      },
    ],
    resource_defs: {
      "test_provider_dna": {
        "test_provider":
        [
          {
            name: "angryPost",
            base_types: [resource_base_def],
            dimensions: [
              {
                name: "likeness",
                range: { name: "10-scale", kind: { Integer: { min: 0, max: 10 } } },
                computed: false,
              },
            ],
          },
        ],
      }
    },
    methods: [
      {
        name: "total_likeness_method",
        target_resource_def: {
          name: "angryPost",
          base_types: [resource_base_def],
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
        requires_validation: false,
      },
    ],
    cultural_contexts: [
      {
        name: "more than 5 total likeness, biggest to smallest",
        resource_def: {
          name: "angryPost",
          base_types: [resource_base_def],
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
            dimension: {
              name: "total_likeness",
              range: { name: "10-scale", kind: { Integer: { min: 0, max: 1000000 } } },
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
        resource_def: {
          name: "angryPost",
          base_types: [resource_base_def],
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
            dimension: {
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