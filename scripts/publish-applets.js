import { AdminWebsocket, AppAgentWebsocket } from "@holochain/client";
import { execSync } from "child_process";
import yaml from "js-yaml";
import fs from "fs";

const TESTING_APPLETS_PATH = `${process.cwd()}/testing-applets`;

function getAppletsPaths() {
  return fs
    .readdirSync(TESTING_APPLETS_PATH)
    .filter((p) => p.endsWith(".webhapp"));
}

async function publishApplets() {
  const adminWs = await AdminWebsocket.connect(
    `ws://localhost:${process.env.ADMIN_PORT}`,
    100000
  );
  const appPorts = await adminWs.listAppInterfaces();
  const appWs = await AppAgentWebsocket.connect(
    `ws://localhost:${appPorts[0]}`,
    "DevHub",
    100000
  );
  const devhubCells = await appWs.appInfo();
  for (const [role_name, [cell]] of Object.entries(devhubCells.cell_info)) {
    await adminWs.authorizeSigningCredentials(cell["provisioned"].cell_id, {
      All: null,
    });
  }
  const allAppsOutput = await appWs.callZome({
    role_name: "happs",
    fn_name: "get_happs_by_tags",
    zome_name: "happ_library",
    payload: ["we-applet"],
  });
  const appletsPaths = getAppletsPaths();
  for (const path of appletsPaths) {
    const appletName = path.split(".")[0];
    if (allAppsOutput.payload.find((app) => app.content.title === appletName)) {
      console.log(`Applet ${appletName} already published`);
      continue;
    }

    console.log(`Publishing ${appletName}...`);
    unpackWebHapp(appletName);

    const dnaEntities = [];

    const dnas = fs
      .readdirSync(`${TESTING_APPLETS_PATH}/${appletName}/happ/dnas`)
      .filter((name) => !name.endsWith("dna"));

    for (const dna of dnas) {
      const dnaManifest = yaml.load(
        fs.readFileSync(
          `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna}/dna.yaml`
        )
      );

      const integrityZomeEntities = [];
      const coordinatorZomeEntities = [];
      for (const izome of dnaManifest.integrity.zomes) {
        const izomeEntity = await appWs.callZome({
          role_name: "dnarepo",
          zome_name: "dna_library",
          fn_name: "create_zome",
          payload: {
            name: izome.name,
            zome_type: 0,
            display_name: izome.name,
            description: "",
          },
        });
        const zome_bytes = fs.readFileSync(
          `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna}/zomes/integrity/${izome.name}.wasm`
        );
        const izomeVersionEntity = await appWs.callZome({
          role_name: "dnarepo",
          zome_name: "dna_library",
          fn_name: "create_zome_version",
          payload: {
            for_zome: izomeEntity.payload.id,
            version: "0.1",
            ordering: 1,
            zome_bytes,
            hdk_version: "v0.1.0",
          },
        });

        integrityZomeEntities.push([izomeEntity, izomeVersionEntity]);
      }
      for (const czome of dnaManifest.coordinator.zomes) {
        const czomeEntity = await appWs.callZome({
          role_name: "dnarepo",
          zome_name: "dna_library",
          fn_name: "create_zome",
          payload: {
            name: czome.name,
            zome_type: 1,
            display_name: czome.name,
            description: "",
          },
        });
        const zome_bytes = fs.readFileSync(
          `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna}/zomes/coordinator/${czome.name}.wasm`
        );
        const czomeVersionEntity = await appWs.callZome({
          role_name: "dnarepo",
          zome_name: "dna_library",
          fn_name: "create_zome_version",
          payload: {
            for_zome: czomeEntity.payload.id,
            version: "0.1",
            ordering: 1,
            zome_bytes,
            hdk_version: "v0.1.0",
          },
        });
        coordinatorZomeEntities.push([czomeEntity, czomeVersionEntity]);
      }
      const dnaEntity = await appWs.callZome({
        role_name: "dnarepo",
        zome_name: "dna_library",
        fn_name: "create_dna",
        payload: {
          name: dna,
          display_name: dna,
          description: "",
        },
      });
      const dnaVersionEntity = await appWs.callZome({
        role_name: "dnarepo",
        zome_name: "dna_library",
        fn_name: "create_dna_version",
        payload: {
          for_dna: dnaEntity.payload.id,
          version: "0.1",
          ordering: 1,
          hdk_version: "v0.1.0",
          integrity_zomes: integrityZomeEntities.map(([ze, zve]) => ({
            name: ze.payload.content.name,
            zome: zve.payload.content.for_zome,
            version: zve.payload.id,
            resource: zve.payload.content.mere_memory_addr,
            resource_hash: zve.payload.content.mere_memory_hash,
          })),
          zomes: coordinatorZomeEntities.map(([ze, zve]) => ({
            name: ze.payload.content.name,
            zome: zve.payload.content.for_zome,
            version: zve.payload.id,
            resource: zve.payload.content.mere_memory_addr,
            resource_hash: zve.payload.content.mere_memory_hash,
            dependencies: dnaManifest.coordinator.zomes
              .find((z) => z.name === ze.payload.content.name)
              .dependencies.map((d) => d.name),
          })),
          origin_time: "2022-02-11T23:05:19.470323Z",
        },
      });

      dnaEntities.push([dnaEntity, dnaVersionEntity]);
    }

    const appEntity = await appWs.callZome({
      role_name: "happs",
      zome_name: "happ_library",
      fn_name: "create_happ",
      payload: {
        title: appletName,
        subtitle: appletName,
        description: appletName,
        tags: ["we-applet"],
      },
    });
    const happManifest = yaml.load(
      fs.readFileSync(`${TESTING_APPLETS_PATH}/${appletName}/happ/happ.yaml`)
    );

    const file_bytes = fs.readFileSync(
      `${TESTING_APPLETS_PATH}/${appletName}/ui.zip`
    );

    const fileEntity = await appWs.callZome({
      role_name: "web_assets",
      zome_name: "web_assets",
      fn_name: "create_file",
      payload: {
        file_bytes,
      },
    });
    const guiEntity = await appWs.callZome({
      role_name: "happs",
      zome_name: "happ_library",
      fn_name: "create_gui",
      payload: {
        name: "UI",
        description: "",
      },
    });
    const guiVersionEntity = await appWs.callZome({
      role_name: "happs",
      zome_name: "happ_library",
      fn_name: "create_gui_release",
      payload: {
        version: "0.1",
        changelog: "",
        for_gui: guiEntity.payload.id,
        for_happ_releases: [],
        web_asset_id: fileEntity.payload.address,
      },
    });
    const appVersionEntity = await appWs.callZome({
      role_name: "happs",
      zome_name: "happ_library",
      fn_name: "create_happ_release",
      payload: {
        name: "0.1",
        description: "",
        for_happ: appEntity.payload.id,
        ordering: 1,
        manifest: happManifest,
        official_gui: guiVersionEntity.payload.id,
        hdk_version: "v0.1.0",
        dnas: dnaEntities.map(([de, dve]) => ({
          role_name: de.payload.content.name,
          dna: de.payload.id,
          version: dve.payload.id,
          wasm_hash: dve.payload.content.wasm_hash,
        })),
      },
    });

    console.log("Published applet: ", appletName);
  }
}

// Output structure:
// testing-applets/gather
// ├── gather.happ
// ├── happ
// │   ├── dnas
// │   │   ├── gather
// │   │   │   ├── dna.yaml
// │   │   │   └── zomes
// │   │   │       ├── coordinator
// │   │   │       │   ├── file_storage.wasm
// │   │   │       │   ├── gather.wasm
// │   │   │       │   └── profiles.wasm
// │   │   │       └── integrity
// │   │   │           ├── file_storage_integrity.wasm
// │   │   │           ├── gather_integrity.wasm
// │   │   │           └── profiles_integrity.wasm
// │   │   └── gather.dna
// │   └── happ.yaml
// ├── ui.zip
// └── web-happ.yaml
function unpackWebHapp(appletName) {
  if (fs.existsSync(`${TESTING_APPLETS_PATH}/${appletName}`)) return;
  execSync(
    `hc web-app unpack ${TESTING_APPLETS_PATH}/${appletName}.webhapp -o ${TESTING_APPLETS_PATH}/${appletName}`
  );
  const webhapp = yaml.load(
    fs.readFileSync(`${TESTING_APPLETS_PATH}/${appletName}/web-happ.yaml`)
  );

  fs.renameSync(
    `${TESTING_APPLETS_PATH}/${appletName}/${webhapp.happ_manifest.bundled}`,
    `${TESTING_APPLETS_PATH}/${appletName}/${appletName}.happ`
  );
  fs.renameSync(
    `${TESTING_APPLETS_PATH}/${appletName}/${webhapp.ui.bundled}`,
    `${TESTING_APPLETS_PATH}/${appletName}/ui.zip`
  );

  execSync(
    `hc app unpack ${TESTING_APPLETS_PATH}/${appletName}/${appletName}.happ -o ${TESTING_APPLETS_PATH}/${appletName}/happ`
  );
  const happManifest = yaml.load(
    fs.readFileSync(`${TESTING_APPLETS_PATH}/${appletName}/happ/happ.yaml`)
  );

  fs.mkdirSync(`${TESTING_APPLETS_PATH}/${appletName}/happ/dnas`);
  for (const dna of happManifest.roles) {
    fs.renameSync(
      `${TESTING_APPLETS_PATH}/${appletName}/happ/${dna.dna.bundled}`,
      `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}.dna`
    );
    execSync(
      `hc dna unpack ${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}.dna -o ${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}`
    );

    const dnaManifest = yaml.load(
      fs.readFileSync(
        `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}/dna.yaml`
      )
    );
    fs.mkdirSync(
      `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}/zomes`
    );
    fs.mkdirSync(
      `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}/zomes/integrity`
    );
    fs.mkdirSync(
      `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}/zomes/coordinator`
    );

    for (const zome of dnaManifest.integrity.zomes) {
      fs.renameSync(
        `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}/${zome.bundled}`,
        `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}/zomes/integrity/${zome.name}.wasm`
      );
    }

    for (const zome of dnaManifest.coordinator.zomes) {
      fs.renameSync(
        `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}/${zome.bundled}`,
        `${TESTING_APPLETS_PATH}/${appletName}/happ/dnas/${dna.name}/zomes/coordinator/${zome.name}.wasm`
      );
    }
  }
}

async function publishAppletsRetry() {
  try {
    await publishApplets();
  } catch (e) {
    console.log(
      "Couldn't publish applets yet because the conductor is still setting up, have you entered your password? Retrying again in a few seconds..."
    );
    setTimeout(async () => {
      await publishAppletsRetry();
    }, 15000);
  }
}
publishAppletsRetry();
