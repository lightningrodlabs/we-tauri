import { html } from "lit";
import { spreadProps } from '@open-wc/lit-helpers'
import type { Meta, StoryObj } from "@storybook/web-components";
import { b64images } from '@neighbourhoods/design-system-styles';

import { DashboardIconButtons, HorizontalTabButtons } from "./menu.stories";
import NHButton from './button'
import NHMenu from './menu'
import NHPageHeaderCard from './page-header-card'

import { NHComponent } from './ancestors/base'

class TestRoot extends NHComponent {
  static elementDefinitions = {
    'nh-button': NHButton,
    'nh-menu': NHMenu,
    'nh-page-header-card': NHPageHeaderCard,
  }

  render() {
    return html`<nh-page-header-card
    slot=${this.slotName}
    .heading=${this.header}
  >
    ${this.secondary == "back"
      ? html`<img
          src="data:image/svg+xml;base64,${b64images.icons.backCaret}"
          slot="secondary-action"
        />`
      : this.secondary == "dashboard-menu"
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
    ${this.primary == "dashboard-buttons"
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
      : this.primary == "button"
      ? html`<nh-button
          .label=${this.primaryText}
          .variant=${"primary"}
          .size=${"stretch"}
          slot="primary-action"
        ></nh-button>`
      : null}
  </nh-page-header-card>`
  }
}

customElements.define('page-header-card--test-root', TestRoot)

export interface PageHeaderCardProps {
  header: string;
  secondary: string;
  primary: string;
  primaryText: string;
  slotName: string;
}

const meta: Meta<PageHeaderCardProps> = {
  title: "NHComponent/PageHeaderCard",
  component: "page-header-card--test-root",
  argTypes: {},
  render: (args) => html`<page-header-card--test-root ${spreadProps(args)} />`,
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
