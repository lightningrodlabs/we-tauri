import {
  NHDelegateReceiver,
  NHDelegateReceiverComponent,
  NHDelegateReceiverConstructor,
  AppBlockDelegate,
  ResourceBlockDelegate,
  InputAssessmentWidgetDelegate,
  OutputAssessmentWidgetDelegate
} from "@neighbourhoods/nh-launcher-applet"

/**
 * Allows rendering a single child web component in a completely scoped manner.
 * The child component does not need to be registered globally or in any other
 * shadow DOM.
 *
 * If you are using the Lit templating system, one can use this as so:
 * ```ts
 *   html`<app-block-renderer .component=${CustomApp} .nhDelegate=${componentNhDelegate}></app-block-renderer>`
 *   html`<resource-block-renderer .component=${Component} .nhDelegate=${componentNhDelegate}></resource-block-renderer>`
 *   html`<input-assessment-renderer .component=${Component} .nhDelegate=${componentNhDelegate}></input-assessment-renderer>`
 *   html`<output-assessment-renderer .component=${Component} .nhDelegate=${componentNhDelegate}></output-assessment-renderer>`
 * ```
 *
 * If you are using plain JS, the it can be set as so:
 * ```ts
 *   const el = shadow.createElement('app-block-renderer')
 *   el.component = Component
 *   el.nhDelegate = componentNhDelegate
 * ```
 */
export class BlockRenderer<D> extends HTMLElement implements NHDelegateReceiver<D> {
  _registry: CustomElementRegistry
  _element: NHDelegateReceiverComponent<D> | null
  _component: NHDelegateReceiverConstructor<D> | null
  _delegate: D | null

  constructor() {
    super();
    // The polyfill must be loaded to in order to create the CustomElementRegistry
    // it replaces all of the behaviour of the registry,
    // but also allows instantiating multiple copies
    const customElements = (this._registry = new CustomElementRegistry())

    // Initialize props
    this._element = null
    this._component = null
    this._delegate = null

    // Passing in the new CustomElementRegistry into the shadowDOM:
    // Normally attachShadow does not accept the customElements parameter, but the polyfill
    // replaces the function with its own.
    // After the polyfill has been loaded the shadowDOM API has been monkey patched
    // to expose a few new interfaces.
    this.attachShadow({mode: 'open', customElements})

    // set loading content -- but I'm not sure we really need this since the
    // blank state shouldn't be long until the inner components take over and
    // have their own loading screen
    // @ts-ignore
    this.shadowRoot.innerHTML = `<div id="compRoot"><b>L&nbsp;O&nbsp;A&nbsp;D&nbsp;I&nbsp;N&nbsp;G&nbsp;.&nbsp;.&nbsp;.</b></div>`
  }

  // Expose the component setter/getter
  set component(component: NHDelegateReceiverConstructor<D>) {
    this._registry.define('child-elem', this._component = component)
    this.render()
  }

  // Expose the required nhDelegate setter
  set nhDelegate(delegate: D) {
    this._delegate = delegate
    this.render()
  }

  // Let the DOM know we take attributes
  static get observedAttributes() { 
    return ['component', 'nhDelegate']
  }

  // This allows devs to accidentally use attributes instead of props for whatever reason that may happen.
  attributeChangedCallback(name: string, _oldValue: any, newValue: any) {
    switch (name) {
      case 'component':
        // since there are no other components in our registry, just use `child-elem`
        this._registry.define('child-elem', (this._component = newValue))
        break
      case 'nhDelegate':
        this._delegate = newValue
        break
    }
    this.render()
  }

  connectedCallback() {
    this.render()
  }

  render() {
    // Only change from loading once all the necessary props are set
    if (this._component != null && this._delegate != null) {
      const shadow = this.shadowRoot
      if (this._element == null) {
        // This does the same thing as document.createElement, but in the
        // shadowDOM using the new CustomElementRegistry created above.
        // The this.shadowRoot.createElement does not exist until the polyfill
        // is loaded as this is one of the monkey patched APIs.
        // @ts-ignore
        this._element = shadow.createElement('child-elem')
        // replace all the children (note this removes any event listeners attached to objects under the shadow root)
        // @ts-ignore
        shadow.replaceChildren(this._element)
      }

      if (this._element) {
        this._element.nhDelegate = this._delegate
      }
    }
  }
}

// Export specialized versions of the BlockRenderer
export class AppBlockRenderer extends BlockRenderer<AppBlockDelegate> {}
export class ResourceBlockRenderer extends BlockRenderer<ResourceBlockDelegate> {}
export class InputAssessmentRenderer extends BlockRenderer<InputAssessmentWidgetDelegate> {}
export class OutputAssessmentRenderer extends BlockRenderer<OutputAssessmentWidgetDelegate> {}
