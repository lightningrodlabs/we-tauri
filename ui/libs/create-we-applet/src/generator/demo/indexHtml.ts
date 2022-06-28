import { ScFile, ScNodeType } from '@source-craft/types';
import camelCase from 'lodash-es/camelCase';
import kebabCase from 'lodash-es/kebabCase';
import upperFirst from 'lodash-es/upperFirst';
import snakeCase from 'lodash-es/snakeCase';

export const indexHtml = ({gameName}: {gameName: string;}): ScFile => ({
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
      import renderFunctions from "../out-tsc";
      import { HolochainClient } from "@holochain-open-dev/cell-client";
      import { ProfilesStore } from "@holochain-open-dev/profiles/mock";
      import { ProfilesZomeMock } from "@holochain-open-dev/profiles";
      import { AdminWebsocket } from "@holochain/client";

      const container = document.getElementById("container");

      async function setup() {
        const client = await HolochainClient.connect(
          \`ws://localhost:\${process.env.HC_PORT}\`,
          "${gameName}"
        );

        const adminWs = await AdminWebsocket.connect(
          \`ws://localhost:\${process.env.ADMIN_PORT}\`
        );

        const cellData = client.appInfo.cell_data;

        const renders = renderFunctions(
          client,
          adminWs,
          client.appInfo.cell_data,
          {
            profilesStore: new ProfilesStore(new ProfilesZomeMock(), {
              avatarMode: "identicon",
            }),
          }
        );

        renders.full(container, window.customElements);
      }
      setup();
    </script>
  </body>
</html>
`
});
    