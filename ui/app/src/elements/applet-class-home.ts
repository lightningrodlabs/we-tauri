import { EntryHash } from "@holochain/client";
import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { css, html, LitElement } from "lit";
import { TaskSubscriber } from "lit-svelte-stores";
import { property } from "lit/decorators.js";
import { matrixContext } from "../context";
import { MatrixStore } from "../matrix-store";
import { sharedStyles } from "../sharedStyles";
import { get } from "svelte/store";




export class AppletClassHome extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext, subscribe: true })
  _matrixStore!: MatrixStore;

  @property()
  appletClassId!: EntryHash; // devHub hApp release hash

  // _appletClassInfo = new TaskSubscriber(
  //   this,
  //   () => this._matrixStore.getAppletClassInfo(this.appletClassId),
  //   () => [this._matrixStore, this.appletClassId]
  // );


  render() {
    const appletClassInfo = get(this._matrixStore.getAppletClassInfo(this.appletClassId))
    return html`
    <div class="column" style="flex: 1; align-items: center; position: relative;">


      <div class="applet-instances-container">On the left end of the top bar you can see all instances of this applet in all of your groups.</div>
      <div class="special-mode-container">On that end of the top bar you can see special modes this applet may provide.</div>

      ${ appletClassInfo!.logoSrc
        ? html`<img src=${appletClassInfo!.logoSrc!} />`
        : html ``
      }
      <div class="title default-font">This is the Home of the <b>${appletClassInfo!.name}</b> Applet</div>
      <div class="content default-font">In future versions of <b>We</b> and/or this Applet you may be able to customize what you see on this page.</div>


    </div>
    `
  }

  static styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        position: relative;
      }

      .title {
        font-size: 1.4em;
        margin-top: 50px;
      }

      .content {
        font-size: 1.1em;
        max-width: 500px;
        margin-top: 20px;
        text-align: center;
      }

      .applet-instances-container {
        position: absolute;
        max-width: 400px;
        left: 96px;
        top: 7px;
        border-radius: 12px;
        padding: 8px;
        border: black 2px solid;
        background-color: #303f9f36;
      }

      .special-mode-container {
        position: absolute;
        max-width: 300px;
        right: 7px;
        top: 7px;
        border-radius: 12px;
        border: black 2px solid;
        padding: 8px;
        background-color: #ffff004f;
      }

      img {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        margin-top: 90px;
      }

      h1 {
        color: black;
      }
    `,
  ];

}