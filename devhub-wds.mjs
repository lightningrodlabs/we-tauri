export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: true,

  middleware: [
    async (ctx, next) => {
      if (ctx.request.url.includes(".launcher-env.json", undefined)) {

        console.log('hiii')
        ctx.body = {
          APP_INTERFACE_PORT: `ws://localhost:${process.env.HC_PORT}`,
          ADMIN_INTERFACE_PORT: `ws://localhost:${process.env.ADMIN_PORT}`,
          INSTALLED_APP_ID: "DevHub",
        };
      }

      return next();
    },
  ],

  rootDir: './DevHub/ui',

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  appIndex: "index.html",
});
