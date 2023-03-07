import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { property, query } from "lit/decorators.js";
import { importModuleFromText } from "../../applets/import-module-from-file";
import { weStyles } from "../../shared-styles";

const importfunction = `function esm(templateStrings, ...substitutions) {
  let js = templateStrings.raw[0];
  for (let i = 0; i < substitutions.length; i++) {
    js += substitutions[i] + templateStrings.raw[i + 1];
  }
  return (
    'data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(js)))
  );
}
async function importModuleFromText(text) {
  const module = await import(esm\`\${text}\`);

  return module;
}`;
// TODO: use the ViewFrameInIframe component instead of the ViewFrame when moved to tauri
export class ViewFrameInIframe extends ScopedElementsMixin(LitElement) {
  @property()
  globalVars: any;

  @property()
  appletJs!: string;

  @property()
  initFrameJs!: string;

  @query("#view-frame")
  iframe!: HTMLIFrameElement;

  onLoad() {
    const styleChild = this.iframe.contentDocument!.createElement("style");
    styleChild.innerHTML =
      "body {margin: 0; height: 100%; width: 100%; display: flex;} ";
    this.iframe.contentDocument!.body.appendChild(styleChild);

    const iframe = this.iframe;

    if (this.globalVars) {
      for (const [key, value] of Object.entries(this.globalVars)) {
        this.iframe.contentWindow![key] = value;
      }
    }
    const js = this.appletJs;
    const scriptChild = iframe.contentDocument!.createElement("script");
    scriptChild.innerHTML =
      importfunction +
      " const js = `" +
      js +
      "`;importModuleFromText(js).then(m => { const applet = m.default;  (" +
      this.initFrameJs +
      ")(applet, document.body, window) });";
    setTimeout(() => {
      iframe.contentDocument!.body.appendChild(scriptChild);
    });
  }

  render() {
    return html`<iframe
      id="view-frame"
      @load=${() => this.onLoad()}
      style="flex: 1"
    ></iframe>`;
  }

  static styles = [
    css`
      :host {
        display: flex;
      }
    `,
    weStyles,
  ];
}

export class ViewFrame extends ScopedElementsMixin(LitElement) {
  @property()
  globalVars: any;

  @property()
  appletJs!: string;

  @property()
  initFrameJs!: string;

  @query("#view-frame")
  iframe!: HTMLElement;

  async firstUpdated() {
    const mod = await importModuleFromText(this.appletJs);
    const applet = mod.default;

    eval(`(${this.initFrameJs})(applet, this.iframe, this.globalVars)`);
  }

  render() {
    return html`<div id="view-frame" style="display: flex; flex: 1"></div>`;
  }

  static styles = [
    css`
      :host {
        display: flex;
      }
    `,
    weStyles,
  ];
}
