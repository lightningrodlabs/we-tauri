import {
  CellId,
  CellInfo,
  AppInfo,
  DnaHash,
  AgentPubKey
} from "@holochain/client";
import { compareUint8Arrays } from "./utils"

/**
 * Returns the cell_id if the cell info corresponds to a provisioned or cloned cell
 */
export function getCellId(cellInfo: CellInfo): CellId {
  if ("provisioned" in cellInfo) {
    return cellInfo.provisioned.cell_id;
  }
  if ("cloned" in cellInfo) {
    return cellInfo.cloned.cell_id;
  }
  throw new Error("CellInfo does not contain a CellId.")
}

/**
 * Returns the cell_id if the cell info corresponds to a cloned cell
 */
export function getClonedCellId(cellInfo: CellInfo): CellId {
  if ("cloned" in cellInfo) {
    return cellInfo.cloned.cell_id;
  }
  return [new Uint8Array(), new Uint8Array()];
}

/**
 * Gets a DNA hash out of the cell_id array (more readable, more verbose)
 */
export function dnaHash(cell_id: CellId): DnaHash {
  return cell_id![0];
}

/**
 * Gets an Agent Pubkey out of the cell_id array (more readable, more verbose)
 */
export function agentPubKey(cell_id: CellId): AgentPubKey {
  return cell_id![1];
}

/**
 * Compare two Cell Ids (both dna hashes and agent pubkeys)
 */
export function compareCellIds(a: CellId, b: CellId): boolean {
  return compareUint8Arrays(dnaHash(a), dnaHash(b))
    && compareUint8Arrays(agentPubKey(a), agentPubKey(b))
}

/**
 * Get the cell name from from the cell info
 */
export function getCellName(cellInfo: CellInfo): string | undefined {
  if ("provisioned" in cellInfo) {
    return cellInfo.provisioned.name;
  }
  if ("cloned" in cellInfo) {
    return cellInfo.cloned.name;
  }
  if ("stem" in cellInfo) {
    return cellInfo.stem.name;
  }
}

/**
 * Get the the provisioned cell for a role given the appInfo
 *
 * @param appInfo : AppInfo
 * @param role : string
 */
export function getProvisionedDnaHash(
  appInfo: AppInfo,
  role: string
) {
  // Find the provisioned cell for the group
  const cellInfo = appInfo.cell_info[role].find((cellInfo) => "provisioned" in cellInfo);
  if (cellInfo) {
    // Get the dna hash
    const weDnaHash = dnaHash(getCellId(cellInfo));
    if (weDnaHash) {
      return weDnaHash
    } else {
      throw Error(`Could not get dna hash for "${role}" cell`)
    }
  } else {
    throw Error(`Could not find provisioned "${role}" cell.`)
  }
}
