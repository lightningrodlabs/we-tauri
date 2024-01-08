import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import NHAlert from './alert';

customElements.define('nh-alert', NHAlert)

interface AlertProps {
  title: string;
  description: string;
  variant: "success" | "danger" ;
}

const meta: Meta<AlertProps> = {
  title: 'NHComponent/Alert',
  component: 'nh-alert',
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
  },
  parameters: { 
    backgrounds: { default: 'surface' },
  },
  render: (args) => html`<nh-alert
    .type=${args.variant}
    .title=${args.title}
    .description=${args.description}
  ></nh-alert>`,
};

export default meta;

type Story = StoryObj<AlertProps>;

const variantParams = {
  controls: {
    exclude:/variant/g
  }
};

// Variants

export const Success: Story = {
  args: {
    variant: "success",
    title: "A toast!",
    description: "Something really cool happened!",
  },
  parameters: variantParams
};

export const Failure: Story = {
  args: {
    variant: "danger",
    title: "A toast!",
    description: "Sorry, things didn't go well for you!",
  },
  parameters: variantParams
};

export const ToastSuccess: Story = {
  args: {
    variant: "success",
    title: "A toast for all of your great efforts",
    description: "All of your dreams are coming true! How about an extra long message to celebrate...",
  },
  parameters: variantParams,

  render: (args) => html`<nh-alert
    .open=${false}
    .type=${args.variant}
    .isToast=${true}
    .title=${args.title}
    .description=${args.description}></nh-alert>
  <button @click=${(e: Event) => e.currentTarget.previousElementSibling.openToast()}>Click Me</button><nh-alert
    .open=${false}
    .type=${args.variant}
    .title=${args.title}
    .isToast=${true}
    .description=${args.description}></nh-alert>
  <button @click=${(e: Event) => e.currentTarget.previousElementSibling.openToast()}>Click Me</button><nh-alert
    .open=${false}
    .type=${args.variant}
    .title=${args.title}
    .isToast=${true}
    .description=${args.description}></nh-alert>
  <button @click=${(e: Event) => e.currentTarget.previousElementSibling.openToast()}>Click Me</button>`,
};
export const ToastFailure: Story = {
  args: {
    variant: "danger",
    title: "Applet already installed. No need to reinstall it.",
    description: "Description of what went wrong or something else that would help the user get to a solution",
  },
  parameters: variantParams,

  render: (args) => html`<nh-alert
    .open=${false}
    .type=${args.variant}
    .title=${args.title}
    .isToast=${true}
    .description=${args.description}></nh-alert>
  <button @click=${(e: Event) => e.currentTarget.previousElementSibling.openToast()}>Click Me</button><nh-alert
    .open=${false}
    .type=${args.variant}
    .title=${args.title}
    .isToast=${true}
    .description=${args.description}></nh-alert>
  <button @click=${(e: Event) => e.currentTarget.previousElementSibling.openToast()}>Click Me</button><nh-alert
    .open=${false}
    .type=${args.variant}
    .title=${args.title}
    .isToast=${true}
    .description=${args.description}></nh-alert>
  <button @click=${(e: Event) => e.currentTarget.previousElementSibling.openToast()}>Click Me</button>`,
};