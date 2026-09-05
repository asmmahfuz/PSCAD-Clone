/**
 * PSCAD Modern - CSMF Control Blocks Facade & Universal Exports
 */

export * from './csmf/mathBlocks';
export * from './csmf/logicBlocks';
export * from './csmf/nonlinearBlocks';
export * from './csmf/powerTransforms';
export * from './csmf/pwmGenerators';
export * from './csmf/csmfEngine';

import { MathBlocks } from './csmf/mathBlocks';
import { PowerTransforms } from './csmf/powerTransforms';

export class ControlBlocks {
  static Gain(u: number, K: number = 1.0, offset: number = 0.0): number {
    return MathBlocks.Gain(u, K, offset);
  }

  static Sum(inputs: number[] = [], signs: string[] = []): number {
    return MathBlocks.Sum(inputs, signs);
  }

  static Integrator(
    u: number,
    dt: number,
    state: { y: number; prevU: number } = { y: 0, prevU: 0 },
    minLimit: number = -Infinity,
    maxLimit: number = Infinity,
    K: number = 1.0
  ): { output: number; state: { y: number; prevU: number } } {
    return MathBlocks.Integrator(u, dt, state, minLimit, maxLimit, K);
  }

  static PID(
    error: number,
    dt: number,
    state: { integ: number; prevErr: number; derivFilt: number } = { integ: 0, prevErr: 0, derivFilt: 0 },
    Kp: number = 1.0,
    Ki: number = 5.0,
    Kd: number = 0.01,
    Tf: number = 0.005,
    minOut: number = -10.0,
    maxOut: number = 10.0
  ): { output: number; state: { integ: number; prevErr: number; derivFilt: number } } {
    return MathBlocks.PID(error, dt, state, Kp, Ki, Kd, Tf, minOut, maxOut);
  }

  static PLL(
    Va: number,
    Vb: number,
    Vc: number,
    dt: number,
    state: any = { theta: 0, omega: 2 * Math.PI * 60, piState: { integ: 2 * Math.PI * 60, prevErr: 0, derivFilt: 0 } },
    kp: number = 60.0,
    ki: number = 1400.0
  ): any {
    return PowerTransforms.PLL(Va, Vb, Vc, dt, state, kp, ki);
  }
}
