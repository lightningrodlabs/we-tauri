import "./dialog";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import type { DialogType } from "./dialog";

export interface DialogProps {
  title: string;
  heading: string;
  dialogType: DialogType;
  size: "large" | "small";
  disabled: boolean;
}

const meta: Meta<DialogProps> = {
  title: "NHComponentShoelace/Dialog",
  component: "nh-dialog",
  argTypes: {
    title: { control: "text" },
    heading: { control: "text" },
  },
  render: (args) => html`<nh-dialog
    title=${args.title}
    size=${args.size}
    dialogType=${args.dialogType}
    handleOk=${() => {}}
    isOpen=${true}
    .primaryButtonDisabled=${args.disabled}
  >
    <p>
      ${false ||
      `Lorem ipsum dolor sit amet, consectetur adipiscing elit. In mi massa,
      auctor vitae viverra et, consequat vulputate felis. Integer congue leo
      quis urna vestibulum varius. Duis vehicula ligula id leo.`}
    </p>
  </nh-dialog>`,
};

export default meta;

type Story = StoryObj<DialogProps>;

export const Default: Story = {
  args: {
    title: "Confirm",
    size: "small",
    dialogType: DialogType.createNeighbourhood,
    disabled: false,
  },
};
export const Disabled: Story = {
  args: {
    title: "Confirm",
    size: "small",
    dialogType: DialogType.createNeighbourhood,
    disabled: true,
  },
};
export const WidgetConfig: Story = {
  args: {
    title: "Configure Applet Widgets",
    size: "large",
    dialogType: DialogType.widgetConfig,
    disabled: false,
  },
};
