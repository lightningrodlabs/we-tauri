import "./page-header-card";
import "./menu";
import "./button";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { backArrow } from "./b64images";
import { DashboardIconButtons, HorizontalTabButtons } from "./menu.stories";

export interface PageHeaderCardProps {
  header: string;
  secondary: string;
  primary: string;
  primaryText: string;
  slotName: string;
}

const meta: Meta<PageHeaderCardProps> = {
  title: "NHComponent/PageHeaderCard",
  component: "nh-page-header-card",
  argTypes: {},
  render: (args) => html`<nh-page-header-card
    slot=${args.slotName}
    .heading=${args.header}
  >
    ${args.secondary == "back"
      ? html`<img
          src="data:image/svg+xml;base64,${backArrow}"
          slot="secondary-action"
        />`
      : args.secondary == "dashboard-menu"
      ? html`<nh-menu
          .direction=${(HorizontalTabButtons.args as any).direction}
          .itemLabels=${(HorizontalTabButtons.args as any).itemLabels}
          .itemComponentTag=${(HorizontalTabButtons.args as any).itemComponentTag}
          .itemComponentProps=${(HorizontalTabButtons.args as any).itemComponentProps}
          .theme=${(HorizontalTabButtons.args as any).theme}
          .fixedFirstItem=${(HorizontalTabButtons.args as any).fixedFirstItem}
          .addItemButton=${(HorizontalTabButtons.args as any).addItemButton}
          slot="secondary-action"
        >
        </nh-menu>`
      : null}
    ${args.primary == "dashboard-buttons"
      ? html`<nh-menu
      .direction=${(DashboardIconButtons.args as any).direction}
      .itemLabels=${(DashboardIconButtons.args as any).itemLabels}
      .itemComponentTag=${(DashboardIconButtons.args as any).itemComponentTag}
      .itemComponentProps=${(DashboardIconButtons.args as any).itemComponentProps}
      .theme=${(DashboardIconButtons.args as any).theme}
      .fixedFirstItem=${(DashboardIconButtons.args as any).fixedFirstItem}
      .addItemButton=${(DashboardIconButtons.args as any).addItemButton}
      slot="primary-action"
    >
    </nh-menu>`
      : args.primary == "button"
      ? html`<nh-button
          .label=${args.primaryText}
          .variant=${"primary"}
          .size=${"stretch"}
          slot="primary-action"
        ></nh-button>`
      : null}
  </nh-page-header-card>`,
};

export default meta;

type Story = StoryObj<PageHeaderCardProps>;

export const Basic: Story = {
  args: {
    slotName: "header",
    header: "Applet Library",
  },
};
export const AppletLibrary: Story = {
  args: {
    slotName: "header",
    header: "Applet Library",
    secondary: "back",
    primary: "button",
    primaryText: "Upload Applet File",
  },
};
export const Dashboard: Story = {
  args: {
    slotName: "top-menu",
    header: "",
    secondary: "dashboard-menu",
    primary: "dashboard-buttons",
    primaryText: "ok",
  },
};
