import { ScFile, ScNodeType } from '@source-craft/types';

export const indexHtml = ({appletName}: {appletName: string}): ScFile => ({
  type: ScNodeType.File,
  content: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Page Title</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="container"></div>

    <script type="module">
      import { ProfilesStore, ProfilesService } from "@holochain-open-dev/profiles";
      import { ProfilesZomeMock } from "@holochain-open-dev/profiles/mocks";
      import { AppWebsocket, AdminWebsocket } from "@holochain/client";
      import Applet from "../out-tsc";

      const container = document.getElementById("container");

      async function setup() {
        const appWs = await AppWebsocket.connect(
          \`ws://localhost:\${process.env.HC_PORT}\`
        );

        const adminWs = await AdminWebsocket.connect(
          \`ws://localhost:\${process.env.ADMIN_PORT}\`
        );

        const appInfo = await appWs.appInfo({
          installed_app_id: "${appletName}-applet",
        });

        const renderers = await Applet.appletRenderers(
          appWs,
          adminWs,
          {
            profilesStore: new ProfilesStore(
              new ProfilesService(new ProfilesZomeMock())
            ),
          },
          [{ weInfo: { name: "Demo We Group", logoSrc: ""}, installedAppInfo: appInfo}]
        );
        renderers.full(container, window.customElements);
      }
      setup();
    </script>
  </body>
</html>
`
});
