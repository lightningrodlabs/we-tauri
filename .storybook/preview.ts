// polyfills
import '@webcomponents/scoped-custom-element-registry'

import type { Preview } from "@storybook/web-components";

import { b64fonts } from '@neighbourhoods/design-system-styles';

const preview: Preview = {
  parameters: {
    backgrounds: {
    // For where to use each of these, see: 
    // https://github.com/orgs/neighbour-hoods/projects/1/views/1?filterQuery=depth&pane=issue&itemId=33428362
    
      default: 'canvas',
      values: [
        {
          name: 'backdrop',
          value: '#0c0a0d',
        },
        {
          name: 'canvas',
          value: '#18151b',
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
