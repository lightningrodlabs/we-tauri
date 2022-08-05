import { contextProvided } from "@lit-labs/context";
import { ScopedElementsMixin } from "@open-wc/scoped-elements";
import { LitElement } from "lit";
import { state } from "lit/decorators";
import { MatrixStore } from "../_stores/matrix-store";





export class MainDashboard extends ScopedElementsMixin(LitElement) {

  @contextProvided({ context: matrixContext })
  @state()
  _matrixStore!: MatrixStore;



  _installedAppletClasses  = new TaskSubscriber(
      this,
      () => this._matrixStore.getGroupInfosForAppletClass(),
      () => [this.wesStore]
  );


}