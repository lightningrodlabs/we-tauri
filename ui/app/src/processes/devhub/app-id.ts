import {
  AdminWebsocket,
  AppAgentCallZomeRequest,
  AppAgentClient,
  AppAgentEvents,
  AppAgentWebsocket,
  AppSignalCb,
  CellType,
  CreateCloneCellRequest,
  DisableCloneCellRequest,
  EnableCloneCellRequest,
  GrantedFunctionsType,
  RoleNameCallZomeRequest,
  signZomeCall,
} from "@holochain/client";
import { UnsubscribeFunction } from "emittery";
import { initAppClient } from "../../utils";
import { getAllAppsWithGui } from "./get-happs";

const DEVHUB_APP_ID = "DevHub-0.1.3";

export async function initDevhubClient(
  adminWebsocket: AdminWebsocket
): Promise<AppAgentClient> {
  const client = await initAppClient(DEVHUB_APP_ID, 300000);

  const devhubClient = new WrappedAppAgentClient(client);
  try {
    await getAllAppsWithGui(devhubClient);
  } catch (e) {
    const devhubCells = await client.appInfo();
    for (const [role_name, [cell]] of Object.entries(devhubCells.cell_info)) {
      await adminWebsocket.authorizeSigningCredentials(
        cell[CellType.Provisioned].cell_id,
        {
          [GrantedFunctionsType.All]: null,
        }
      );
    }
  }
  return devhubClient;
}
export class WrappedAppAgentClient implements AppAgentClient {
  constructor(protected client: AppAgentWebsocket) {}
  appInfo() {
    return this.client.appInfo();
  }
  on<Name extends keyof AppAgentEvents>(
    eventName: Name | readonly Name[],
    listener: AppSignalCb
  ): UnsubscribeFunction {
    return this.client.on(eventName, listener);
  }
  async callZome(zomeCallRequest: AppAgentCallZomeRequest) {
    let payload: AppAgentCallZomeRequest = {
      ...zomeCallRequest,
    };
    if ((payload as RoleNameCallZomeRequest).role_name) {
      const cellId = this.client.getCellIdFromRoleName(
        (payload as RoleNameCallZomeRequest).role_name,
        await this.client.appInfo()
      );
      payload = await signZomeCall({
        ...payload,
        cell_id: cellId,
      } as any);
    }

    return this.client.callZome(payload);
  }
  createCloneCell(arg: CreateCloneCellRequest) {
    return this.client.createCloneCell(arg);
  }
  enableCloneCell(arg: EnableCloneCellRequest) {
    return this.client.enableCloneCell(arg);
  }
  disableCloneCell(arg: DisableCloneCellRequest) {
    return this.client.disableCloneCell(arg);
  }
  get myPubKey() {
    return this.client.myPubKey;
  }
}
