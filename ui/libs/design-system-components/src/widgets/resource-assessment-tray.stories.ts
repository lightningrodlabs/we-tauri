import ResourceAssessmentTray from "./resource-assessment-tray";
import { html } from "lit";
import type { Meta, StoryObj } from "@storybook/web-components";
import { NHComponent } from "../ancestors/base";
import NHAssessmentContainer from "./assessment-container";
import { b64images } from "@neighbourhoods/design-system-styles";

class TestRoot extends NHComponent {
  static elementDefinitions = {
    "assessment-container": NHAssessmentContainer,
    "resource-assessment-tray": ResourceAssessmentTray,
  };

  render() {
    return html`<resource-assessment-tray
      .editable=${this.editable}
      .editing=${this.editing}
      .assessmentWidgetTrayConfig=${this?.assessmentWidgetTrayConfig || []}
      >
      <div slot="widgets">
        ${this?.icons?.map(({value, icon} : any) => html`
        <assessment-container
          .assessmentValue=${value}
          .iconImg=${icon}
        ></assessment-container>`)}
      </div>
    </resource-assessment-tray>`;
  }
}

customElements.define("assessment-tray--test-root", TestRoot);

const meta: Meta<any> = {
  title: "NHComponent/Widgets/ResourceAssessmentTray",
  component: "assessment-tray--test-root",
  argTypes: {},
  parameters: {
    backgrounds: { default: "detail" },
  },
  render: (args) => html`<assessment-tray--test-root .editable=${args.editable} .assessmentWidgetTrayConfig=${args.assessmentWidgetTrayConfig} .editing=${args.editing} .icons=${args.icons} />`,
};

export default meta;

type Story = StoryObj<any>;


export const Empty: Story = {
  args: {
    editing: false,
    icons: [
      { value: 0, icon: "" },
    ]
  },
};

export const Empty5: Story = {
  args: {
    editing: false,
    icons: [
      { value: 0, icon: "" },
      { value: 0, icon: "" },
      { value: 0, icon: "" },
      { value: 0, icon: "" },
      { value: 0, icon: "" },
    ]
  },
};
export const Full5: Story = {
  args: {
    editing: false,
    icons: [
      { value: 2, icon: b64images.icons.fire },
      { value: 1, icon: b64images.icons.chili },
      { value: 5, icon: b64images.icons.icecube },
      { value: -2, icon: b64images.icons.pear },
      { value: 4322, icon: b64images.icons.snowflake },
    ]
  },
};

export const WithConfig: Story = {
  args: {
    editing: false,
    editable: true,
    assessmentWidgetTrayConfig: [
      {
        inputAssessmentWidget: {
          dimensionEh: new Uint8Array([1,2,3]),
          appletEh: new Uint8Array([4,5,6]),
          componentName: 'thumb'
        }
      },
      {
        inputAssessmentWidget: {
          dimensionEh: new Uint8Array([1,2,3]),
          appletEh: new Uint8Array([4,5,6]),
          componentName: 'Heart'
        }
      },
    ]
  },
};
export const WithConfigEditing: Story = {
  args: {
    editing: true,
    editable: true,
    assessmentWidgetTrayConfig: [
      {
        inputAssessmentWidget: {
          dimensionEh: new Uint8Array([1,2,3]),
          appletEh: new Uint8Array([4,5,6]),
          componentName: 'thumb'
        }
      },
      {
        inputAssessmentWidget: {
          dimensionEh: new Uint8Array([1,2,3]),
          appletEh: new Uint8Array([4,5,6]),
          componentName: 'Heart'
        }
      },
    ]
  },
};

export const EmptyConfig: Story = {
  args: {
    editing: false,
    editable: true,
    icons: [
      { value: 0, icon: "" },
      { value: 0, icon: "" },
      { value: 0, icon: "" },
      { value: 0, icon: "" },
      { value: 0, icon: "" },
    ]
  },
};

export const EditingEmptyConfig: Story = {
  args: {
    editing: true,
    editable: true,
    icons: [
      { value: 0, icon: "" },
      { value: 0, icon: "" },
      { value: 0, icon: "" },
      { value: 0, icon: "" },
      { value: 0, icon: "" },
    ]
  },
};
