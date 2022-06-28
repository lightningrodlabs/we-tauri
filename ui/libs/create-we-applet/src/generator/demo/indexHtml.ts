import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const indexHtml = ({appletNameTitleCase, appletName}: {appletNameTitleCase: string; appletName: string;}): ScFile => ({
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
      import Applet from "../out-tsc";
      import { HolochainClient } from "@holochain-open-dev/cell-client";
      import { ${appletNameTitleCase}Store, ${appletNameTitleCase}Service } from "@holochain-open-dev/${appletName}";
      import { ${appletNameTitleCase}ZomeMock } from "@holochain-open-dev/${appletName}/mocks";
      import { AppWebsocket, AdminWebsocket } from "@holochain/client";

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
            ${appletName}Store: new ${appletNameTitleCase}Store(
              new ${appletNameTitleCase}Service(new ${appletNameTitleCase}ZomeMock())
            ),
          },
          appInfo
        );
        renderers.full(container, window.customElements);
      }
      setup();
    </script>
  </body>
</html>
`
});
    