import { AdminWebsocket, AppAgentWebsocket } from "@holochain/client";
import { execSync } from "child_process";
import yaml from "js-yaml";
import fs from "fs";
import crypto from "crypto";
import { wrapPathInSvgWithoutPrefix } from "@holochain-open-dev/elements";
import { mdiPost } from "@mdi/js";

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

  const apps = await adminWs.listApps({});

  const devhubAppId = apps.find((app) =>
    app.installed_app_id.includes("DevHub")
  ).installed_app_id;

  const appstoreAppId = apps.find((app) =>
    app.installed_app_id.includes("appstore")
  ).installed_app_id;

  const appPorts = await adminWs.listAppInterfaces();
  const devhubClient = await AppAgentWebsocket.connect(
    `ws://localhost:${appPorts[0]}`,
    devhubAppId,
    100000
  );
  const appstoreClient = await AppAgentWebsocket.connect(
    `ws://localhost:${appPorts[0]}`,
    appstoreAppId,
    100000
  );
  const devhubCells = await devhubClient.appInfo();
  for (const [role_name, [cell]] of Object.entries(devhubCells.cell_info)) {
    await adminWs.authorizeSigningCredentials(cell["provisioned"].cell_id, {
      All: null,
    });
  }
  const appstoreCells = await appstoreClient.appInfo();
  for (const [role_name, [cell]] of Object.entries(appstoreCells.cell_info)) {
    await adminWs.authorizeSigningCredentials(cell["provisioned"].cell_id, {
      All: null,
    });
  }

  const publisher = await appstoreClient.callZome({
    role_name: "appstore",
    zome_name: "appstore_api",
    fn_name: "create_publisher",
    payload: {
      name: "holo",
      location: {
        country: "es",
        region: "Catalunya",
        city: "Barcelona",
      },
      website: { url: "https://lightningrodlabs.org", context: "website" },
      icon: crypto.randomBytes(1_000),
      email: "some@email.org",
      editors: [],
    },
  });

  const allAppsOutput = await appstoreClient.callZome({
    role_name: "appstore",
    zome_name: "appstore_api",
    fn_name: "get_all_apps",
    payload: null,
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
        const izomeEntity = await devhubClient.callZome({
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
        const izomeVersionEntity = await devhubClient.callZome({
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
        const czomeEntity = await devhubClient.callZome({
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
        const czomeVersionEntity = await devhubClient.callZome({
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
      const dnaEntity = await devhubClient.callZome({
        role_name: "dnarepo",
        zome_name: "dna_library",
        fn_name: "create_dna",
        payload: {
          name: dna,
          display_name: dna,
          description: "",
        },
      });
      const dnaVersionEntity = await devhubClient.callZome({
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

    const happManifest = yaml.load(
      fs.readFileSync(`${TESTING_APPLETS_PATH}/${appletName}/happ/happ.yaml`)
    );

    const appEntity = await devhubClient.callZome({
      role_name: "happs",
      zome_name: "happ_library",
      fn_name: "create_happ",
      payload: {
        title: appletName,
        subtitle: happManifest.description || "",
        description: "",
        tags: ["we-applet"],
      },
    });

    const file_bytes = fs.readFileSync(
      `${TESTING_APPLETS_PATH}/${appletName}/ui.zip`
    );

    const fileEntity = await devhubClient.callZome({
      role_name: "web_assets",
      zome_name: "web_assets",
      fn_name: "create_file",
      payload: {
        file_bytes,
      },
    });
    const guiEntity = await devhubClient.callZome({
      role_name: "happs",
      zome_name: "happ_library",
      fn_name: "create_gui",
      payload: {
        name: "UI",
        description: "",
      },
    });
    const guiVersionEntity = await devhubClient.callZome({
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
    const appVersionEntity = await devhubClient.callZome({
      role_name: "happs",
      zome_name: "happ_library",
      fn_name: "create_happ_release",
      payload: {
        version: "0.1",
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

    const happlibraryDnaHash =
      devhubCells.cell_info["happs"][0]["provisioned"].cell_id[0];

    const iconBytes = Buffer.from(logo(), "utf8");
    await appstoreClient.callZome({
      role_name: "appstore",
      zome_name: "appstore_api",
      fn_name: "create_app",
      payload: {
        title: appletName,
        subtitle: happManifest.description || "",
        description: "",
        icon: iconBytes,
        publisher: publisher.payload.id,
        devhub_address: {
          dna: happlibraryDnaHash,
          happ: appEntity.payload.id,
          gui: guiVersionEntity.payload.id,
        },
        editors: [],
      },
    });

    console.log("Published applet: ", appletName);
  }
}

function logo() {
  return `data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NDMuMDUgMTM1MC4xNCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMxZjE5MWE7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5EV2ViQ2FtcF9Mb2dvPC90aXRsZT48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yMTAuNDUsMTIzOS44bDEwLjA2LS42NGMwLDEwLjQ5LDcuNzMsMTcuNjksMTguNjQsMTcuNjksMTAuMDYsMCwxNi45NS01LjMsMTYuOTUtMTMsMC02Ljg4LTQtMTAuNDktMTMuMTMtMTIuNWwtOS41My0xLjhjLTE0LjUxLTIuNTQtMjAuNDQtMTAtMjAuNDQtMjAuNzYsMC0xMi45MiwxMC40OS0yMS42MSwyNS41Mi0yMS42MSwxNC44MywwLDI1Ljg0LDEwLjA2LDI1Ljk1LDI0LjI1bC0xMC4yNy41M2MtLjExLTEwLjA2LTYuNjctMTYuNzMtMTYuMS0xNi43My04Ljc5LDAtMTQuOTMsNS4wOC0xNC45MywxMi43MSwwLDYuNDYsMy42LDEwLjE3LDExLjIzLDExLjg2bDkuNTMsMS44YzE1LjU3LDIuNzUsMjIuNDUsMTAuMTcsMjIuNDUsMjEuMzksMCwxMy0xMS4yMywyMS45Mi0yNy41NCwyMS45MkMyMjIsMTI2NC45LDIxMC40NSwxMjU0LjczLDIxMC40NSwxMjM5LjhaIi8+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjc3LjYsMTE4OWg0Ny4zNHY4LjI2SDI4OHYyNWgzNC44NXY4SDI4OHYzMi44M0gyNzcuNloiLz48cG9seWdvbiBjbGFzcz0iY2xzLTEiIHBvaW50cz0iMjcxLjUzIDExNDMuOCA5MS42NiA4OTMuODkgMTAwLjM3IDg4Ny42MyAyNzEuNTMgMTEyNS40NCA0NDIuNjkgODg3LjYzIDQ1MS4zOSA4OTMuOSAyNzEuNTMgMTE0My44Ii8+PHJlY3QgY2xhc3M9ImNscy0xIiB4PSIyNjYuMTYiIHk9IjQxNy40NSIgd2lkdGg9IjEwLjczIiBoZWlnaHQ9IjcxNy4xNiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE0Ni4zNiwxODkuNzRoMTEuMjVMMTc1LjQ1LDI1M2wxNi44Ny02My4yN2gxMi44N0wyMjIsMjUzbDE3LjUyLTYzLjI3aDExLjE0bC0yMi4yOCw3NS43MUgyMTUuOWwtMTcuMy02NC41Ny0xNy4zLDY0LjU3SDE2OC44NVoiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0zMDQuNTgsMjQxLjExSDI2Mi41MWMuMTEsMTAuMjcsNywxOC4yOCwxNywxOC4yOCw3LjY4LDAsMTQuMTctNC41NCwxNS4yNS0xMS4xNGw4Ljg3Ljc2Yy0xLjA4LDEwLjM4LTExLjE0LDE4LjA2LTI0LjEyLDE4LjA2LTE1LjY4LDAtMjcuMTUtMTEuNzktMjcuMTUtMjguNjYsMC0xNi4zMywxMC45Mi0yOC41NSwyNi43MS0yOC41NSwxNC44MiwwLDI1Ljc0LDExLjQ2LDI1Ljc0LDI3LjlBMTYuMzUsMTYuMzUsMCwwLDEsMzA0LjU4LDI0MS4xMVpNMjk1LDIzNC43M2MwLTkuNzMtNi42LTE3LjMtMTYtMTcuMy05LjE5LDAtMTYsNy0xNi40NCwxNy4zWiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTM3My40NywyMzguNzNjMCwxNi41NS0xMC43MSwyOC4xMi0yNi4xNywyOC4xMkEyMS41OCwyMS41OCwwLDAsMSwzMjgsMjU2LjE1djkuM0gzMThWMTg5Ljc0SDMyOFYyMjFhMjEuNTUsMjEuNTUsMCwwLDEsMTkuMjUtMTAuOTJDMzYyLjc2LDIxMC4wNywzNzMuNDcsMjIxLjg2LDM3My40NywyMzguNzNabS0xMC4xNywwYzAtMTIuMTEtNy4zNS0yMC4zMy0xOC0yMC4zM3MtMTgsOC4zMy0xOCwyMC4zM2MwLDExLjY4LDcuMzUsMTkuNzksMTgsMTkuNzlTMzYzLjMsMjUwLjQxLDM2My4zLDIzOC43M1oiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xMTEuMTMsMzI0YzAtMjIuMzksMTYuMzMtMzkuNjksMzguNS0zOS42OSwxOS4yNSwwLDM1LDEyLjU1LDM1LjgsMzBsLTEwLjE3Ljg3Yy0xLTEyLjMzLTExLjY4LTIxLjUyLTI1LjYzLTIxLjUyLTE1Ljc5LDAtMjcuOCwxMi4zMy0yNy44LDMwLjM5LDAsMTcuNDEsMTEuNDYsMzAuMjgsMjcuOCwzMC4yOCwxMy4xOSwwLDI0LjMzLTguNzYsMjUuNDItMjEuMmwxMC4yNy43NmMtMSwxNi44Ny0xNi4xMSwyOS44NS0zNS42OSwyOS44NUMxMjguMTEsMzYzLjY3LDExMS4xMywzNDcsMTExLjEzLDMyNFoiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0xOTcuMjQsMzQ4LjIxYzAtOS44NCw4Ljc2LTE2LDI0LjIzLTE3LjNsMTAuOTItMXYtMi40OWMwLTcuNjgtNS4xOS0xMy4wOS0xMi43Ni0xMy4wOXMtMTMuMDksNS0xMy41MiwxMi4xMWwtOS40MS0uMzJjLjU0LTExLjc5LDkuODQtMTkuOSwyMi45My0xOS45LDEzLjQxLDAsMjIuODIsOC44NywyMi44MiwyMS42M3YxOC40OWE4Ni4wOSw4Ni4wOSwwLDAsMCwxLjMsMTUuNDdIMjM0Yy0uNjUtMi4yNy0xLjA4LTYuMDYtMS4wOC0xMi43NmgtLjMyYy0xLjczLDguMjItOC41NCwxMy43NC0xOC4yOCwxMy43NEMyMDMuODQsMzYyLjgxLDE5Ny4yNCwzNTcuMDcsMTk3LjI0LDM0OC4yMVpNMjMyLjUsMzQwdi00LjU0bC05Ljg0Ljg3Yy0xMCwuODctMTUuNDcsNC43Ni0xNS40NywxMS4xNCwwLDUuMyw0LjIyLDguNzYsMTAuNzEsOC43NkMyMjYuNjYsMzU2LjIxLDIzMi41LDM0OS41LDIzMi41LDM0MFoiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0zNDAuOSwzMjguNzR2MzMuMUgzMzAuODRWMzMwLjE0YzAtMTAtNC4zMy0xNS40Ny0xMi4yMi0xNS40Ny04Ljg3LDAtMTMuODQsNi44MS0xMy44NCwxOS4zNnYyNy44SDI5NC43MlYzMzAuMTRjMC0xMC00LjU0LTE1LjQ3LTEyLjY1LTE1LjQ3LTkuMDgsMC0xNC4xNyw2LjgxLTE0LjE3LDE5LjM2djI3LjhIMjU3Ljg0di01NGgxMC4wNmwtLjMyLDEzLjc0YzEuOTUtOS41Miw4LjMzLTE1LjE0LDE3Ljc0LTE1LjE0czE2LjEyLDUuMTksMTguNDksMTQuMTdjMi4yNy05LjA4LDguNTQtMTQuMTcsMTguMDYtMTQuMTdDMzMzLjY1LDMwNi40NiwzNDAuOSwzMTQuODksMzQwLjksMzI4Ljc0WiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTQxMS44MywzMzUuMTJjMCwxNi41NS0xMC43MSwyOC4xMi0yNi4xNywyOC4xMmEyMS41OCwyMS41OCwwLDAsMS0xOS4yNS0xMC43MXYyOS44NUgzNTYuMzVWMzA3Ljg2SDM2Ni40djkuNTJhMjEuNTUsMjEuNTUsMCwwLDEsMTkuMjUtMTAuOTJDNDAxLjEyLDMwNi40Niw0MTEuODMsMzE4LjI1LDQxMS44MywzMzUuMTJabS0xMC4xNywwYzAtMTIuMTEtNy4zNS0yMC4zMy0xOC0yMC4zM3MtMTgsOC4zMy0xOCwyMC4zM2MwLDExLjY4LDcuMzUsMTkuNzksMTgsMTkuNzlTNDAxLjY2LDM0Ni44LDQwMS42NiwzMzUuMTJaIi8+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjMyLjcyLDg4SDI2MC4zYzIzLjE0LDAsMzkuMTUsMTUuNTcsMzkuMTUsMzcuODVzLTE2LDM3Ljg1LTM5LjE1LDM3Ljg1SDIzMi43MlptMjcuNDcsNjcuMjdjMTYuODcsMCwyOC41NS0xMi4xMSwyOC41NS0yOS40MnMtMTEuNjgtMjkuNDItMjguNTUtMjkuNDJoLTE3djU4Ljg0WiIvPjwvc3ZnPg==`;
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
      "Couldn't publish applets yet because the conductor is still setting up, have you entered your password and enabled the developer mode? Retrying again in a few seconds..."
    );
    setTimeout(async () => {
      await publishAppletsRetry();
    }, 15000);
  }
}
publishAppletsRetry();
