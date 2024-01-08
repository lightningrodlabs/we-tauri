import type { StorybookConfig } from "@storybook/web-components-vite";

const config: StorybookConfig = {
  stories: ['../components/**/src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-links', '@storybook/addon-interactions'],
  framework: {
    name: "@storybook/web-components-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  // staticDirs: ['../public'],
  async viteFinal(config, { configType }) {
    config.optimizeDeps || (config.optimizeDeps = {})

    // customize the Vite config here
    config.optimizeDeps.include = [
      ...(config.optimizeDeps?.include ?? []),
      '@storybook/web-components',
    ]
    config.optimizeDeps.exclude = [...(config.optimizeDeps?.exclude ?? []), 'lit', 'lit-html']

    // return the customized config
    return config
  },
};
export default config;
