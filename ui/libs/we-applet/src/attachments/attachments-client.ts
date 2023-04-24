import { ZomeClient } from "@holochain-open-dev/utils";
import { AnyDhtHash, AppAgentClient } from "@holochain/client";
import { decode, encode } from "@msgpack/msgpack";
import { HrlWithContext } from "@lightningrodlabs/hrl";

export class AttachmentsClient extends ZomeClient<{}> {
  constructor(
    public client: AppAgentClient,
    public roleName: string,
    public zomeName = "attachments"
  ) {
    super(client, roleName, zomeName);
  }

  addAttachment(
    hash: AnyDhtHash,
    hrlWithContext: HrlWithContext
  ): Promise<void> {
    return this.callZome("add_attachment", {
      hash,
      hrl_with_context: {
        hrl: hrlWithContext.hrl,
        context: encode(hrlWithContext.context),
      },
    });
  }

  async getAttachments(hash: AnyDhtHash): Promise<Array<HrlWithContext>> {
    const hrls = await this.callZome("get_attachments", hash);

    return hrls.map((hrlWithContext) => ({
      hrl: hrlWithContext.hrl,
      context: decode(hrlWithContext.context),
    }));
  }
}
