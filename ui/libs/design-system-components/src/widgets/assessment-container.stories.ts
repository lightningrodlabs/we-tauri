import { b64images } from '@neighbourhoods/design-system-styles';
import type { Meta, StoryObj } from '@storybook/web-components';
import NHAssessmentContainer from './assessment-container';

customElements.define('nh-assessment-container', NHAssessmentContainer)

interface AssessmentWidgetProps {
  name: string;
  iconImg: string;
  iconAlt: string;
}

const meta: Meta<AssessmentWidgetProps> = {
  title: 'NHComponent/Widgets/AssessmentContainer',
  component: 'nh-assessment-container',
  argTypes: {
    name: { control: 'text' },
    iconImg: { control: 'text' },
    iconAlt: { control: 'text' },
  },
  parameters: { 
    backgrounds: { default: 'surface' },
  },
};

export default meta;

type Story = StoryObj<AssessmentWidgetProps>;

export const Empty: Story = {
  args: {
    name: '',
    iconAlt: '', 
    iconImg: null as any
  },
  render: meta.render
};

export const Pear: Story = {
  args: {
    name: 'Pear',
    iconAlt: 'a pear', 
    iconImg: b64images.icons.pear
  },
};
export const Chili: Story = {
  args: {
    name: 'Fire',
    iconAlt: 'hot!', 
    iconImg: b64images.icons.chili
  },
};
