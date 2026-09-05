/**
 * PSCAD Modern - CSMF Logic & Comparison Control Blocks
 */

export class LogicBlocks {
  /**
   * Multi-input Logic Gate: AND, OR, XOR, NOT, NAND, NOR
   * Inputs are evaluated as boolean: true if u >= threshold (default 0.5)
   */
  static LogicGate(
    inputs: number[] = [],
    op: 'AND' | 'OR' | 'XOR' | 'NOT' | 'NAND' | 'NOR' = 'AND',
    threshold: number = 0.5
  ): number {
    const boolInputs = inputs.map(u => (isNaN(u) ? 0 : u) >= threshold);

    let res = false;
    switch (op) {
      case 'AND':
        res = boolInputs.length > 0 && boolInputs.every(b => b);
        break;
      case 'OR':
        res = boolInputs.some(b => b);
        break;
      case 'XOR': {
        const trueCount = boolInputs.filter(b => b).length;
        res = trueCount % 2 === 1;
        break;
      }
      case 'NOT':
        res = boolInputs.length > 0 ? !boolInputs[0] : true;
        break;
      case 'NAND':
        res = !(boolInputs.length > 0 && boolInputs.every(b => b));
        break;
      case 'NOR':
        res = !boolInputs.some(b => b);
        break;
      default:
        res = false;
    }

    return res ? 1.0 : 0.0;
  }

  /**
   * Edge Detector: Produces a 1-timestep pulse when input crosses threshold
   */
  static EdgeDetector(
    u: number,
    state: { prevBool: boolean } = { prevBool: false },
    edgeType: 'rising' | 'falling' | 'both' = 'rising',
    threshold: number = 0.5
  ): { output: number; state: { prevBool: boolean } } {
    const curBool = (isNaN(u) ? 0 : u) >= threshold;
    const prevBool = state.prevBool || false;

    let triggered = false;
    if (edgeType === 'rising' && !prevBool && curBool) {
      triggered = true;
    } else if (edgeType === 'falling' && prevBool && !curBool) {
      triggered = true;
    } else if (edgeType === 'both' && prevBool !== curBool) {
      triggered = true;
    }

    return {
      output: triggered ? 1.0 : 0.0,
      state: { prevBool: curBool }
    };
  }

  /**
   * Flip-Flops: RS, D, JK, T
   */
  static FlipFlop(
    inputs: { sOrD?: number; rOrClk?: number; j?: number; k?: number; clk?: number; reset?: number; set?: number },
    state: { q: boolean; prevClk: boolean } = { q: false, prevClk: false },
    type: 'RS' | 'D' | 'JK' | 'T' = 'RS',
    threshold: number = 0.5
  ): { q: number; qNot: number; state: { q: boolean; prevClk: boolean } } {
    let q = state.q || false;
    const prevClk = state.prevClk || false;

    // Asynchronous Set / Reset
    if (inputs.reset !== undefined && inputs.reset >= threshold) {
      q = false;
      return { q: 0.0, qNot: 1.0, state: { q: false, prevClk: false } };
    }
    if (inputs.set !== undefined && inputs.set >= threshold) {
      q = true;
      return { q: 1.0, qNot: 0.0, state: { q: true, prevClk: false } };
    }

    if (type === 'RS') {
      const S = (inputs.sOrD || 0) >= threshold;
      const R = (inputs.rOrClk || 0) >= threshold;
      if (S && !R) q = true;
      else if (!S && R) q = false;
      // if S && R, prioritize Reset for deterministic safety
      else if (S && R) q = false;
    } else if (type === 'D') {
      const D = (inputs.sOrD || 0) >= threshold;
      const clk = (inputs.rOrClk !== undefined ? inputs.rOrClk : (inputs.clk || 0)) >= threshold;
      const isRising = !prevClk && clk;
      if (isRising) {
        q = D;
      }
      return {
        q: q ? 1.0 : 0.0,
        qNot: q ? 0.0 : 1.0,
        state: { q, prevClk: clk }
      };
    } else if (type === 'JK') {
      const J = (inputs.j || 0) >= threshold;
      const K = (inputs.k || 0) >= threshold;
      const clk = (inputs.clk || 0) >= threshold;
      const isRising = !prevClk && clk;
      if (isRising) {
        if (J && !K) q = true;
        else if (!J && K) q = false;
        else if (J && K) q = !q;
      }
      return {
        q: q ? 1.0 : 0.0,
        qNot: q ? 0.0 : 1.0,
        state: { q, prevClk: clk }
      };
    } else if (type === 'T') {
      const T = (inputs.sOrD || 0) >= threshold;
      const clk = (inputs.clk || 0) >= threshold;
      const isRising = !prevClk && clk;
      if (isRising && T) {
        q = !q;
      }
      return {
        q: q ? 1.0 : 0.0,
        qNot: q ? 0.0 : 1.0,
        state: { q, prevClk: clk }
      };
    }

    return {
      q: q ? 1.0 : 0.0,
      qNot: q ? 0.0 : 1.0,
      state: { q, prevClk: false }
    };
  }

  /**
   * Analog Comparator: Compares u1 and u2 (u1 OP u2)
   */
  static Comparator(
    u1: number,
    u2: number = 0.0,
    op: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ' = 'GT',
    hysteresis: number = 0.0,
    state: { prevOut: boolean } = { prevOut: false }
  ): { output: number; state: { prevOut: boolean } } {
    const val1 = isNaN(u1) ? 0.0 : u1;
    const val2 = isNaN(u2) ? 0.0 : u2;
    const diff = val1 - val2;

    let res = state.prevOut || false;

    if (hysteresis > 0) {
      if (diff > hysteresis / 2.0) {
        res = true;
      } else if (diff < -hysteresis / 2.0) {
        res = false;
      }
    } else {
      switch (op) {
        case 'GT': res = diff > 0.0; break;
        case 'GTE': res = diff >= 0.0; break;
        case 'LT': res = diff < 0.0; break;
        case 'LTE': res = diff <= 0.0; break;
        case 'EQ': res = Math.abs(diff) < 1e-9; break;
        case 'NEQ': res = Math.abs(diff) >= 1e-9; break;
        default: res = diff > 0.0;
      }
    }

    return {
      output: res ? 1.0 : 0.0,
      state: { prevOut: res }
    };
  }
}
