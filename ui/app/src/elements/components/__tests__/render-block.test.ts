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

// :TODO: This should really be wrapped up into a helper generator fn in some
//        shared @neighbourhoods/applet-framework module.
const renderer = (tagName, classDef) => (i: HTMLElement, r: CustomElementRegistry) => {
  if (r.get(tagName) !== classDef) {
    r.define(tagName, classDef)
  }
  i.innerHTML = `<${tagName} />`
}

describe('RenderBlock', () => {
  const initialRender = async (theHTML) => {
    return await fixture(theHTML)
  }

  describe('Given two components sharing a nested child CustomElement ', () =>
  {
    class Child1 extends ScopedRegistryHost(LitElement) {
      static elementDefinitions = {
        'nh-button': NHButton,
      }

      render() {
        return html`<nh-button>Child 1</nh-button>`
      }
    }

    class Child2 extends ScopedRegistryHost(LitElement) {
      static elementDefinitions = {
        'nh-button': NHButton,
      }

      render() {
        return html`<nh-button>Child 2</nh-button>`
      }
    }

    test(`They should be able to render same child elements`, async () => {
      const harness = await initialRender(testHtml`<div>
        <render-block .renderer=${renderer('child-1', Child1)}></render-block>
        <render-block .renderer=${renderer('child-2', Child2)}></render-block>
      </div>`)

      const children = harness.querySelectorAll('render-block')

      expect(children.length).to.equal(2)
      expect(children[0].shadowRoot?.querySelector('child-1')).shadowDom.to.equal('<nh-button>Child 1</nh-button>')
      expect(children[1].shadowRoot?.querySelector('child-2')).shadowDom.to.equal('<nh-button>Child 2</nh-button>')
    })
  })

  describe('Given a RenderBlock rendering a child CustomElement with dynamic children ', () =>
  {
    class Child3 extends ScopedRegistryHost(LitElement) {
      static elementDefinitions = {
        'nh-button': NHButton,
      }

      render() {
        return html`<nh-button>Child 3</nh-button>`
      }
    }

    class DynamicRenderingChild extends ScopedRegistryHost(LitElement) {
      static elementDefinitions = {
        'render-block': RenderBlock,
        'child-3': Child3,
      }

      render() {
        return html`<div>
          <render-block .renderer=${renderer('child-3', Child3)}></render-block>
          <child-3></child-3>
        </div>`
      }
    }

    test(`RenderBlock children should be able to be rendered recursively no matter their parent elements`, async () => {
      const harness = await initialRender(testHtml`<div>
        <render-block .renderer=${renderer('dynamic-child', DynamicRenderingChild)}></render-block>
        <render-block .renderer=${renderer('child-3', Child3)}></render-block>
      </div>`)

      const child = harness.querySelectorAll('render-block')[0]
      expect(child).shadowDom.to.equal('<div><dynamic-child /></div>', { ignoreAttributes: [{ tags: ['div'], attributes: ['style'] }] })

      const nestedRoot = child?.shadowRoot?.querySelector('dynamic-child')
      expect(nestedRoot).shadowDom.to.equal('<div><render-block></render-block><child-3></child-3></div>')
      expect(nestedRoot?.shadowRoot?.querySelector('child-3')).shadowDom.to.equal('<nh-button>Child 3</nh-button>')

      const nestedChild = nestedRoot?.shadowRoot?.querySelector('render-block')
      expect(nestedChild).shadowDom.to.equal('<div><child-3 /></div>', { ignoreAttributes: [{ tags: ['div'], attributes: ['style'] }] })

      expect(nestedChild?.shadowRoot?.querySelector('child-3')).shadowDom.to.equal('<nh-button>Child 3</nh-button>')
    })
  })

  describe('Given multiple RenderBlocks of the same renderer at different levels in the Shadow DOM hierarchy ', () =>
  {
    class Child4 extends ScopedRegistryHost(LitElement) {
      static elementDefinitions = {
        'nh-button': NHButton,
      }

      render() {
        return html`<nh-button>Child 4</nh-button/>`
      }
    }

    class DynamicRenderingChild1 extends ScopedRegistryHost(LitElement) {
      static elementDefinitions = {
        'render-block': RenderBlock,
      }

      render() {
        return html`<render-block .renderer=${renderer('child-4', Child4)}></render-block>`
      }
    }

    class DynamicRenderingChild2 extends ScopedRegistryHost(LitElement) {
      static elementDefinitions = {
        'render-block': RenderBlock,
      }

      render() {
        return html`<render-block .renderer=${renderer('child-4', Child4)}></render-block>`
      }
    }

    class DynamicRenderingParent2 extends ScopedRegistryHost(LitElement) {
      static elementDefinitions = {
        'dynamic-child': DynamicRenderingChild2,
      }

      render() {
        return html`<dynamic-child></dynamic-child>`
      }
    }

    test(`RenderBlocks should safely register and render elements with appropriate container Shadow DOM`, async () => {
      customElements.define('test-dynamic-child-1', DynamicRenderingChild1)
      customElements.define('test-dynamic-parent-2', DynamicRenderingParent2)

      const harness = await initialRender(testHtml`<div>
        <test-dynamic-child-1></test-dynamic-child-1>
        <test-dynamic-parent-2></test-dynamic-parent-2>
      </div>`)

      // :TODO: finish assertions
    })

  })

})
