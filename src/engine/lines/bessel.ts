/**
 * PSCAD CLONE - Numerical Complex Bessel Function Engine
 * 
 * Provides high-accuracy complex arithmetic and modified Bessel functions of complex arguments:
 * - I0(z), I1(z): Modified Bessel functions of the first kind (orders 0, 1)
 * - K0(z), K1(z): Modified Bessel functions of the second kind (orders 0, 1)
 * - J0(z), J1(z): Regular Bessel functions of the first kind (orders 0, 1)
 * 
 * Used for electromagnetic field skin-effect, tubular conductor internal impedance,
 * sheath transfer impedance, and underground earth return calculations.
 */

export interface Complex {
  re: number;
  im: number;
}

export const C = {
  create: (re: number = 0, im: number = 0): Complex => ({ re, im }),
  zero: (): Complex => ({ re: 0, im: 0 }),
  one: (): Complex => ({ re: 1, im: 0 }),
  j: (): Complex => ({ re: 0, im: 1 }),

  add: (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im }),
  sub: (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im }),
  mul: (a: Complex, b: Complex): Complex => ({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  }),
  scale: (a: Complex, s: number): Complex => ({ re: a.re * s, im: a.im * s }),
  div: (a: Complex, b: Complex): Complex => {
    const denom = b.re * b.re + b.im * b.im;
    if (denom === 0) return { re: 1e12, im: 0 };
    return {
      re: (a.re * b.re + a.im * b.im) / denom,
      im: (a.im * b.re - a.re * b.im) / denom,
    };
  },
  inv: (a: Complex): Complex => C.div(C.one(), a),
  neg: (a: Complex): Complex => ({ re: -a.re, im: -a.im }),
  abs: (a: Complex): number => Math.hypot(a.re, a.im),
  arg: (a: Complex): number => Math.atan2(a.im, a.re),
  conj: (a: Complex): Complex => ({ re: a.re, im: -a.im }),

  sqrt: (z: Complex): Complex => {
    const r = Math.hypot(z.re, z.im);
    const theta = Math.atan2(z.im, z.re);
    const sqrtR = Math.sqrt(r);
    return {
      re: sqrtR * Math.cos(theta / 2),
      im: sqrtR * Math.sin(theta / 2),
    };
  },

  exp: (z: Complex): Complex => {
    const expX = Math.exp(z.re);
    return {
      re: expX * Math.cos(z.im),
      im: expX * Math.sin(z.im),
    };
  },

  ln: (z: Complex): Complex => {
    const r = Math.hypot(z.re, z.im);
    const theta = Math.atan2(z.im, z.re);
    return {
      re: Math.log(Math.max(1e-30, r)),
      im: theta,
    };
  },

  sinh: (z: Complex): Complex => {
    const ez = C.exp(z);
    const enz = C.exp(C.neg(z));
    return C.scale(C.sub(ez, enz), 0.5);
  },

  cosh: (z: Complex): Complex => {
    const ez = C.exp(z);
    const enz = C.exp(C.neg(z));
    return C.scale(C.add(ez, enz), 0.5);
  },

  coth: (z: Complex): Complex => {
    const s = C.sinh(z);
    const c = C.cosh(z);
    return C.div(c, s);
  },

  csch: (z: Complex): Complex => {
    const s = C.sinh(z);
    return C.div(C.one(), s);
  },
};

const EULER_GAMMA = 0.57721566490153286;

/**
 * Series & Asymptotic computation of complex Bessel functions
 */
export class ComplexBessel {
  /**
   * Modified Bessel function I0(z) for complex argument z
   */
  public static I0(z: Complex): Complex {
    const r = C.abs(z);
    if (r < 1e-12) return C.one();

    if (r <= 25) {
      // Ascending series expansion: I0(z) = sum_{k=0}^inf ( (z/2)^k / k! )^2
      const zHalf = C.scale(z, 0.5);
      const zHalfSq = C.mul(zHalf, zHalf);
      let sum = C.one();
      let term = C.one();

      for (let k = 1; k < 60; k++) {
        term = C.scale(C.mul(term, zHalfSq), 1 / (k * k));
        sum = C.add(sum, term);
        if (C.abs(term) < 1e-15 * C.abs(sum)) break;
      }
      return sum;
    } else {
      // Asymptotic expansion: I0(z) ~ exp(z) / sqrt(2*pi*z) * (1 + 1/(8z) + 9/(128 z^2) + ...)
      let zEff = z;
      if (z.re < 0) {
        zEff = C.neg(z); // I0(-z) = I0(z)
      }
      const twoPiZ = C.scale(zEff, 2 * Math.PI);
      const sqrtTwoPiZ = C.sqrt(twoPiZ);
      const invZ = C.inv(zEff);
      const expZ = C.exp(zEff);

      const t1 = C.scale(invZ, 1 / 8);
      const t2 = C.scale(C.mul(invZ, invZ), 9 / 128);
      const t3 = C.scale(C.mul(C.mul(invZ, invZ), invZ), 225 / 3072);
      const series = C.add(C.one(), C.add(t1, C.add(t2, t3)));

      return C.div(C.mul(expZ, series), sqrtTwoPiZ);
    }
  }

  /**
   * Modified Bessel function I1(z) for complex argument z
   */
  public static I1(z: Complex): Complex {
    const r = C.abs(z);
    if (r < 1e-12) return C.scale(z, 0.5);

    if (r <= 25) {
      // Ascending series: I1(z) = (z/2) * sum_{k=0}^inf ( (z^2/4)^k / (k! * (k+1)!) )
      const zHalf = C.scale(z, 0.5);
      const zHalfSq = C.mul(zHalf, zHalf);
      let sum = C.one();
      let term = C.one();

      for (let k = 1; k < 60; k++) {
        term = C.scale(C.mul(term, zHalfSq), 1 / (k * (k + 1)));
        sum = C.add(sum, term);
        if (C.abs(term) < 1e-15 * C.abs(sum)) break;
      }
      return C.mul(zHalf, sum);
    } else {
      // Asymptotic expansion: I1(z) ~ exp(z) / sqrt(2*pi*z) * (1 - 3/(8z) - 15/(128 z^2) - ...)
      let zEff = z;
      let sign = 1;
      if (z.re < 0) {
        zEff = C.neg(z);
        sign = -1; // I1(-z) = -I1(z)
      }
      const twoPiZ = C.scale(zEff, 2 * Math.PI);
      const sqrtTwoPiZ = C.sqrt(twoPiZ);
      const invZ = C.inv(zEff);
      const expZ = C.exp(zEff);

      const t1 = C.scale(invZ, -3 / 8);
      const t2 = C.scale(C.mul(invZ, invZ), -15 / 128);
      const t3 = C.scale(C.mul(C.mul(invZ, invZ), invZ), -315 / 3072);
      const series = C.add(C.one(), C.add(t1, C.add(t2, t3)));

      const res = C.div(C.mul(expZ, series), sqrtTwoPiZ);
      return sign === -1 ? C.neg(res) : res;
    }
  }

  /**
   * Modified Bessel function K0(z) for complex argument z (Re(z) > 0)
   */
  public static K0(z: Complex): Complex {
    const r = C.abs(z);
    if (r < 1e-12) return C.create(25, 0);

    if (r <= 8) {
      // Small argument expansion:
      // K0(z) = - ( ln(z/2) + gamma ) * I0(z) + sum_{k=1}^inf ( (z/2)^{2k} / (k!)^2 * psi(k+1) )
      const zHalf = C.scale(z, 0.5);
      const zHalfSq = C.mul(zHalf, zHalf);
      const lnZHalf = C.ln(zHalf);
      const factor1 = C.neg(C.add(lnZHalf, C.create(EULER_GAMMA, 0)));
      const i0 = ComplexBessel.I0(z);
      const part1 = C.mul(factor1, i0);

      let sum2 = C.zero();
      let term = C.one();
      let harmonic = 0;

      for (let k = 1; k < 40; k++) {
        term = C.scale(C.mul(term, zHalfSq), 1 / (k * k));
        harmonic += 1 / k;
        const psiVal = harmonic;
        const addTerm = C.scale(term, psiVal);
        sum2 = C.add(sum2, addTerm);
        if (C.abs(addTerm) < 1e-15 * C.abs(sum2)) break;
      }
      return C.add(part1, sum2);
    } else {
      // Large argument asymptotic expansion:
      // K0(z) ~ sqrt(pi / (2z)) * exp(-z) * (1 - 1/(8z) + 9/(128 z^2) - 225/(3072 z^3) + ...)
      const piOver2Z = C.div(C.create(Math.PI, 0), C.scale(z, 2));
      const sqrtFactor = C.sqrt(piOver2Z);
      const expNegZ = C.exp(C.neg(z));
      const invZ = C.inv(z);

      const t1 = C.scale(invZ, -1 / 8);
      const t2 = C.scale(C.mul(invZ, invZ), 9 / 128);
      const t3 = C.scale(C.mul(C.mul(invZ, invZ), invZ), -225 / 3072);
      const series = C.add(C.one(), C.add(t1, C.add(t2, t3)));

      return C.mul(sqrtFactor, C.mul(expNegZ, series));
    }
  }

  /**
   * Modified Bessel function K1(z) for complex argument z
   */
  public static K1(z: Complex): Complex {
    const r = C.abs(z);
    if (r < 1e-12) return C.inv(z);

    if (r <= 8) {
      // Small argument series:
      const invZ = C.inv(z);
      const zHalf = C.scale(z, 0.5);
      const zHalfSq = C.mul(zHalf, zHalf);
      const lnZHalf = C.ln(zHalf);
      const factor1 = C.add(lnZHalf, C.create(EULER_GAMMA, 0));
      const i1 = ComplexBessel.I1(z);
      const part2 = C.mul(factor1, i1);

      let sum3 = C.zero();
      let term = zHalf;
      let harmonicK = 0;
      let harmonicK1 = 1;

      sum3 = C.scale(term, 1.0);

      for (let k = 1; k < 40; k++) {
        term = C.scale(C.mul(term, zHalfSq), 1 / (k * (k + 1)));
        harmonicK += 1 / k;
        harmonicK1 += 1 / (k + 1);
        const psiSum = harmonicK + harmonicK1;
        const addTerm = C.scale(term, psiSum);
        sum3 = C.add(sum3, addTerm);
        if (C.abs(addTerm) < 1e-15 * C.abs(sum3)) break;
      }
      const part3 = C.scale(sum3, -0.5);
      return C.add(invZ, C.add(part2, part3));
    } else {
      // Large argument asymptotic expansion:
      const piOver2Z = C.div(C.create(Math.PI, 0), C.scale(z, 2));
      const sqrtFactor = C.sqrt(piOver2Z);
      const expNegZ = C.exp(C.neg(z));
      const invZ = C.inv(z);

      const t1 = C.scale(invZ, 3 / 8);
      const t2 = C.scale(C.mul(invZ, invZ), -15 / 128);
      const t3 = C.scale(C.mul(C.mul(invZ, invZ), invZ), 315 / 3072);
      const series = C.add(C.one(), C.add(t1, C.add(t2, t3)));

      return C.mul(sqrtFactor, C.mul(expNegZ, series));
    }
  }

  /**
   * Regular Bessel function J0(z)
   */
  public static J0(z: Complex): Complex {
    const negJz = C.mul(C.create(0, -1), z);
    return ComplexBessel.I0(negJz);
  }

  /**
   * Regular Bessel function J1(z)
   */
  public static J1(z: Complex): Complex {
    const negJz = C.mul(C.create(0, -1), z);
    const i1 = ComplexBessel.I1(negJz);
    return C.mul(C.j(), i1);
  }
}
