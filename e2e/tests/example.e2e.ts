import { fixture, waitUntil } from "@open-wc/testing-helpers";
import { WeApp } from "../../ui/app/src/we-app";

describe("installing applets on groups works", () => {
  it("should be able to create a password", async () => {
    const weApp: WeApp = await waitUntil(() =>
      document.querySelector("we-app")
    );
    const createPassword = await waitUntil(() =>
      weApp.shadowRoot!.querySelector("create-password")
    );
  });
});
