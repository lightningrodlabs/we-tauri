import '@webcomponents/scoped-custom-element-registry'

import { describe, test, beforeAll, beforeEach } from 'vitest'
import { fixture, html as testHtml, expect } from '@open-wc/testing'

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

// :TODO: This should really be wrapped up into a helper generator fn in some
//        shared @neighbourhoods/applet-framework module.
const renderer = (tagName, classDef) => (i: HTMLElement, r: CustomElementRegistry) => {
  r.define(tagName, classDef)
  i.innerHTML = `<${tagName} />`
}

describe('RenderBlock', () => {
  let harness

  const initialRender = async () => {
    // :TODO: unsure how to assign renderer from target components here
    harness = await fixture(testHtml`<div>
      <render-block .renderer=${renderer('child-1', Child1)}></render-block>
      <render-block .renderer=${renderer('child-2', Child2)}></render-block>
    </div>`)
  }

  describe('Given two components sharing a nested child CustomElement ', () => {
    beforeEach(async () => {
      await initialRender()
    })

    test(`They should be able to render same child elements`, async () => {
      const children = harness.querySelectorAll('render-block')

      expect(children.length).to.equal(2)
      expect(children[0].shadowRoot.querySelector('child-1')).shadowDom.to.equal('<nh-button label="Child 1" />')
      expect(children[1].shadowRoot.querySelector('child-2')).shadowDom.to.equal('<nh-button label="Child 2" />')
    })
  })

})
