import {
  AppEntryDef,
  AppInfo,
  InstallAppRequest,
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
import { fileURLToPath, pathToFileURL } from "url";

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
  let agentsHapps: Array<AppInfo> = [];
  let agent_key;
  let ss_cell_id;
  let provider_cell_id;
  try {
    const admin = conductor.adminWs();

    const sensemakerLocation = pathToFileURL(sensemakerDna);
    console.log(`generating key for: ${agentName}:`);
    agent_key = await admin.generateAgentPubKey();
    const req: InstallAppRequest = {
      installed_app_id: `${agentName}_sensemaker`,
      agent_key,
      membrane_proofs: {},
      bundle: {
        manifest: {
          manifest_version: "1",
          name: "sensemaker_happ",
          description: "",
          roles: [{
            name: "sensemaker_dna",
            // provisioning: {
            //   create: {
            //     deferred: false,
            //   }
            // },
            provisioning: {
              //@ts-ignore
              strategy: 'create',
              deferred: false,
            },
            dna: {
              // modifiers: {
              properties: {
                community_activator: ca_key
                  ? serializeHash(ca_key)
                  : serializeHash(agent_key),
                config: with_config ? sampleConfig(resource_base_type!) : null
              },
              // },
              // location: sensemakerDna,
              // location: sensemakerLocation,
              location: {
                //@ts-ignore
                path: sensemakerDna,
              }
              // path: sensemakerDna,
            }
          }, {
            name: "test_provider_dna",
            // provisioning: {
            //   create: {
            //     deferred: false,
            //   }
            // },
            provisioning: {
              //@ts-ignore
              strategy: 'create',
              deferred: false,
            },
            dna: {
              // location: testProviderDna,
              location: {
                //@ts-ignore
                path: testProviderDna,
              }
            }
          }],
        },
        resources: {},
      }
    };
    console.log(`installing happ for: ${agentName}`);
    //@ts-ignore
    const agentHapp: AppInfo = await admin.installApp(req);
    console.log("++++++++ ======== ++++++++")
    console.log('agent happ', agentHapp)
    console.log("++++++++ ======== ++++++++")
    const ssCellInfo = agentHapp.cell_info["sensemaker_dna"][0]
    ss_cell_id = ("Provisioned" in ssCellInfo) ? ssCellInfo.Provisioned.cell_id : ss_cell_id
    const providerCellInfo = agentHapp.cell_info["test_provider_dna"][0]
    provider_cell_id = ("Provisioned" in providerCellInfo) ? providerCellInfo.Provisioned.cell_id : provider_cell_id
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

export const sampleConfig = (resource_base_type: AppEntryDef) => {
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
        range: { name: "10-scale", kind: { Integer: { min: 0, max: 1000000 } } },
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
