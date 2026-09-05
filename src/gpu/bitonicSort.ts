/**
 * PSCAD Modern - GPU Parallel Bitonic Sorting Engine
 * 
 * Executes O(log^2 N) parallel bitonic sorting for MMC submodule capacitor
 * voltage balancing across high-voltage converter arms (N = 100 .. 400+ SMs).
 */

export interface MmcSubmoduleState {
  smId: number;
  vCap: number;
  state: 'inserted' | 'bypassed' | 'blocked';
}

export class ParallelBitonicSorter {
  /**
   * Sort MMC submodule array using Bitonic Sorting Network
   * @param submodules Array of submodules with capacitor voltages
   * @param ascending If true, sort lowest to highest; if false, highest to lowest
   */
  static sortSubmodules(
    submodules: MmcSubmoduleState[],
    ascending: boolean = true
  ): MmcSubmoduleState[] {
    const n = submodules.length;
    if (n <= 1) return [...submodules];

    // Pad to next power of 2 for bitonic network
    const paddedLen = ParallelBitonicSorter.nextPowerOf2(n);
    const arr: MmcSubmoduleState[] = new Array(paddedLen);

    for (let i = 0; i < paddedLen; i++) {
      if (i < n) {
        arr[i] = { ...submodules[i] };
      } else {
        // Pad with sentinel
        arr[i] = {
          smId: 999999 + i,
          vCap: ascending ? Infinity : -Infinity,
          state: 'bypassed',
        };
      }
    }

    // Bitonic Sorting Stages
    for (let k = 2; k <= paddedLen; k <<= 1) {
      for (let j = k >> 1; j > 0; j >>= 1) {
        for (let i = 0; i < paddedLen; i++) {
          const l = i ^ j;
          if (l > i) {
            const blockAscending = ((i & k) === 0) ? ascending : !ascending;
            const shouldSwap = blockAscending
              ? arr[i].vCap > arr[l].vCap
              : arr[i].vCap < arr[l].vCap;

            if (shouldSwap) {
              const temp = arr[i];
              arr[i] = arr[l];
              arr[l] = temp;
            }
          }
        }
      }
    }

    // Strip padding
    return arr.filter(sm => sm.smId < 999999);
  }

  /**
   * Select submodules to insert/bypass based on MMC arm current and required levels
   * @param submodules Current submodule state array
   * @param numToInsert Number of submodules N_on to insert
   * @param armCurrent Instantaneous arm current i_arm
   */
  static balanceMmcArm(
    submodules: MmcSubmoduleState[],
    numToInsert: number,
    armCurrent: number
  ): MmcSubmoduleState[] {
    // If i_arm > 0 (charging), sort ascending to insert submodules with lowest Vc
    // If i_arm < 0 (discharging), sort descending to insert submodules with highest Vc
    const charging = armCurrent >= 0;
    const sorted = ParallelBitonicSorter.sortSubmodules(submodules, charging);

    const result: MmcSubmoduleState[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const isInserted = i < numToInsert;
      result.push({
        smId: sorted[i].smId,
        vCap: sorted[i].vCap,
        state: isInserted ? 'inserted' : 'bypassed',
      });
    }

    // Restore original ordering by smId
    return result.sort((a, b) => a.smId - b.smId);
  }

  private static nextPowerOf2(n: number): number {
    let p = 1;
    while (p < n) {
      p <<= 1;
    }
    return p;
  }
}
