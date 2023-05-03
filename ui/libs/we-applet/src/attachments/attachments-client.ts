import { AnyDhtHash, AppAgentClient } from "@holochain/client";
import { decode, encode } from "@msgpack/msgpack";
import { DnaHash } from "@holochain/client";
import { AppAgentCallZomeRequest } from "@holochain/client";
import { HrlWithContext } from "../types";

export class AttachmentsClient {
  constructor(
    public client: AppAgentClient,
    public dnaHash: DnaHash,
    public zomeName = "attachments"
  ) {}

  protected callZome(fn_name: string, payload: any) {
    const req: AppAgentCallZomeRequest = {
      cell_id: [this.dnaHash, this.client.myPubKey],
      zome_name: this.zomeName,
      fn_name,
      payload,
    };
    return this.client.callZome(req);
  }

  addAttachment(
    hash: AnyDhtHash,
    hrlWithContext: HrlWithContext
  ): Promise<void> {
    return this.callZome("add_attachment", {
      hash,
      hrl_with_context: {
        hrl: {
          dna_hash: hrlWithContext.hrl[0],
          resource_hash: hrlWithContext.hrl[1],
        },
        context: encode(hrlWithContext.context),
      },
    });
  }

  async getAttachments(hash: AnyDhtHash): Promise<Array<HrlWithContext>> {
    const hrls = await this.callZome("get_attachments", hash);

    return hrls.map((hrlWithContext) => ({
      hrl: [hrlWithContext.hrl.dna_hash, hrlWithContext.hrl.resource_hash],
      context: decode(hrlWithContext.context),
    }));
  }

  removeAttachment(
    hash: AnyDhtHash,
    hrlWithContext: HrlWithContext
  ): Promise<void> {
    return this.callZome("remove_attachment", {
      hash,
      hrl_with_context: {
        hrl: {
          dna_hash: hrlWithContext.hrl[0],
          resource_hash: hrlWithContext.hrl[1],
        },
        context: encode(hrlWithContext.context),
      },
    });
  }
}
