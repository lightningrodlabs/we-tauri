import { b64images } from '@neighbourhoods/design-system-styles';
import './assessment-widget';
import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';

interface AssessmentWidgetProps {
  name: string;
  iconImg: string;
  iconAlt: string;
}

const meta: Meta<AssessmentWidgetProps> = {
  title: 'NHComponent/AssessmentWidget',
  component: 'nh-card',
  argTypes: {
    name: { control: 'text' },
    iconImg: { control: 'text' },
    iconAlt: { control: 'text' },
  },
  render:  (args) => html`<nh-assessment-widget .name=${args.name} .iconAlt=${args.iconAlt} .iconImg=${args.iconImg}></nh-assessment-widget>`,
};

export default meta;

type Story = StoryObj<AssessmentWidgetProps>;

export const BasicWidget: Story = {
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