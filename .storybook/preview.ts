// polyfills
import '@webcomponents/scoped-custom-element-registry'

import type { Preview } from "@storybook/web-components";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'surface',
      values: [
        {
          name: 'backdrop',
          value: '#0c0a0d',
        },
        {
          name: 'surface',
          value: '#251f28',
        },
      ],
    },
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
