import '@webcomponents/scoped-custom-element-registry'

import { describe, expect, test, beforeAll, beforeEach } from 'vitest'
import { fixture, html as testHtml } from '@open-wc/testing'

import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin"
import { html, LitElement } from "lit"
import { property } from "lit/decorators.js"
import { NHButton } from '@neighbourhoods/design-system-components'
import { Renderer } from "@neighbourhoods/nh-launcher-applet"
import { RenderBlock } from '../render-block'

customElements.define('render-block', RenderBlock)

class Child1 extends ScopedRegistryHost(LitElement) {
  static elementDefinitions = {
    'nh-button': NHButton,
  }

  render() {
    return html`<nh-button label="Child 1" />`
  }
}

class Child2 extends ScopedRegistryHost(LitElement) {
  static elementDefinitions = {
    'nh-button': NHButton,
  }

  render() {
    return html`<nh-button label="Child 2" />`
  }
}

describe('RenderBlock', () => {
  let harness, componentDom

  const initialRender = async () => {
    // :TODO: unsure how to assign renderer from target components here
    harness = fixture(testHtml`<div>
      <render-block .renderer=${Child1} />
      <render-block .renderer=${Child2} />
    </div>`)
    componentDom = harness.querySelector('div')
    await componentDom.updateComplete
  }

  describe('Given two components sharing a nested child CustomElement ', () => {
    beforeEach(async () => {
      await initialRender()
    });

    test(`They should be able to render same child elements`, async () => {
      // :TODO: assert that both render-blocks were able to render child nh-button elements
    });
  });

})
