/**
 * Compare two Uint8Arrays byte by byte
 * Note: This doesn't short circuit if a and b have the same length,
 *   to do that convert to loop and return when false.
 */
export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): boolean {
  let ret_val = a.byteLength == b.byteLength;
  return ret_val && a.reduce((prev: boolean, aByte: number, index: number) => (prev && aByte == b[index]), ret_val);
}
