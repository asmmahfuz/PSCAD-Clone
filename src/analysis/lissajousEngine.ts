/**
 * PSCAD Modern - Laboratory Lissajous X-Y Trajectory & Phase Orbit Analysis Engine
 * Phase 20 - Step 20.3: Deep-Dive Signal Analysis Suite
 */

export interface LissajousMetrics {
  phaseDiffDeg: number;       // Phase angle difference Δφ (-180° to +180°)
  phaseDiffRad: number;       // Δφ in radians
  powerFactor: number;        // cos(Δφ) displacement power factor (0 to 1)
  powerFactorType: 'Leading' | 'Lagging' | 'Unity';
  enclosedArea: number;       // Enclosed contour loop area ∮ y dx
  cycleEnergy: number;        // Energy per cycle (Joules or VAR·s)
  circulation: 'Clockwise' | 'CounterClockwise' | 'Linear';
  axialRatio: number;         // b / a (minor to major axis ratio, 0 to 1)
  eccentricity: number;       // sqrt(1 - (b/a)^2) (0 = circle, 1 = line)
  tiltAngleDeg: number;       // Principal tilt angle of ellipse in degrees
  estimatedCycles: number;    // Estimated number of fundamental cycles in record
  frequencyRatio: string;     // e.g. "1:1", "1:2", "2:1", "1:3"
  xRms: number;
  yRms: number;
  xPeak: number;
  yPeak: number;
  xDc: number;
  yDc: number;
}

export interface TrajectoryArrow {
  x: number;
  y: number;
  angle: number; // Tangent angle in radians
}

export class LissajousEngine {
  /**
   * Compute comprehensive Lissajous metrics from X and Y waveform channels
   */
  static analyze(
    xVals: number[],
    yVals: number[],
    _times?: number[]
  ): LissajousMetrics {
    const len = Math.min(xVals.length, yVals.length);
    if (len < 8) {
      return this.emptyMetrics();
    }

    // 1. Calculate statistical moments
    let sumX = 0, sumY = 0;
    let sumX2 = 0, sumY2 = 0;
    let maxAbsX = 0, maxAbsY = 0;

    for (let i = 0; i < len; i++) {
      const x = xVals[i];
      const y = yVals[i];
      sumX += x;
      sumY += y;
      sumX2 += x * x;
      sumY2 += y * y;
      const ax = Math.abs(x);
      const ay = Math.abs(y);
      if (ax > maxAbsX) maxAbsX = ax;
      if (ay > maxAbsY) maxAbsY = ay;
    }

    const meanX = sumX / len;
    const meanY = sumY / len;
    const xRms = Math.sqrt(sumX2 / len);
    const yRms = Math.sqrt(sumY2 / len);

    // 2. Centered covariance and correlation coefficient
    let covXY = 0;
    let varX = 0;
    let varY = 0;
    for (let i = 0; i < len; i++) {
      const dx = xVals[i] - meanX;
      const dy = yVals[i] - meanY;
      covXY += dx * dy;
      varX += dx * dx;
      varY += dy * dy;
    }
    covXY /= len;
    varX /= len;
    varY /= len;

    const stdX = Math.sqrt(Math.max(1e-12, varX));
    const stdY = Math.sqrt(Math.max(1e-12, varY));
    const corr = Math.max(-1.0, Math.min(1.0, covXY / (stdX * stdY)));

    // 3. Green's theorem for contour loop area: Area = 0.5 * sum(x_i * y_{i+1} - x_{i+1} * y_i)
    let signedContourArea = 0;
    for (let i = 0; i < len - 1; i++) {
      signedContourArea += (xVals[i] * yVals[i + 1] - xVals[i + 1] * yVals[i]);
    }
    signedContourArea *= 0.5;

    // Circulation direction: In standard screen/Cartesian coords (y up):
    // Positive signed area = CCW, Negative = CW
    let circulation: 'Clockwise' | 'CounterClockwise' | 'Linear' = 'Linear';
    const absArea = Math.abs(signedContourArea);

    if (absArea > 1e-6 && Math.abs(corr) < 0.998) {
      circulation = signedContourArea > 0 ? 'CounterClockwise' : 'Clockwise';
    }

    // 4. Estimate fundamental cycles via zero-crossing count of X and Y
    let zeroCrossingsX = 0;
    let zeroCrossingsY = 0;
    for (let i = 1; i < len; i++) {
      const prevX = xVals[i - 1] - meanX;
      const currX = xVals[i] - meanX;
      if ((prevX >= 0 && currX < 0) || (prevX < 0 && currX >= 0)) {
        zeroCrossingsX++;
      }
      const prevY = yVals[i - 1] - meanY;
      const currY = yVals[i] - meanY;
      if ((prevY >= 0 && currY < 0) || (prevY < 0 && currY >= 0)) {
        zeroCrossingsY++;
      }
    }
    const estimatedCycles = Math.max(1, Math.round(zeroCrossingsX / 2));
    const cycleEnergy = absArea / estimatedCycles;

    // 5. Frequency Ratio Estimation fx : fy
    let frequencyRatio = '1:1';
    if (zeroCrossingsX > 0 && zeroCrossingsY > 0) {
      if (Math.abs(zeroCrossingsX - zeroCrossingsY) <= 1 || Math.abs(zeroCrossingsX / zeroCrossingsY - 1.0) <= 0.25) {
        frequencyRatio = '1:1';
      } else {
        const ratio = zeroCrossingsX / zeroCrossingsY;
        if (Math.abs(ratio - 0.5) <= 0.2) frequencyRatio = '1:2';
        else if (Math.abs(ratio - 2.0) <= 0.3) frequencyRatio = '2:1';
        else if (Math.abs(ratio - 0.333) <= 0.15) frequencyRatio = '1:3';
        else if (Math.abs(ratio - 3.0) <= 0.35) frequencyRatio = '3:1';
        else if (Math.abs(ratio - 1.5) <= 0.2) frequencyRatio = '3:2';
        else if (Math.abs(ratio - 0.667) <= 0.15) frequencyRatio = '2:3';
        else frequencyRatio = `${ratio.toFixed(1)}:1`;
      }
    }

    // 6. Phase Difference (Δφ) & Displacement Power Factor
    // cos(Δφ) = corr
    let rawPhaseRad = Math.acos(corr);
    // Circulation determines leading vs lagging
    let phaseDiffRad = circulation === 'CounterClockwise' ? rawPhaseRad : -rawPhaseRad;
    let phaseDiffDeg = (phaseDiffRad * 180.0) / Math.PI;

    const powerFactor = Math.abs(corr);
    let powerFactorType: 'Leading' | 'Lagging' | 'Unity' = 'Unity';
    if (powerFactor < 0.999) {
      // Convention: If current leads voltage (CCW), Leading. If current lags voltage (CW), Lagging.
      powerFactorType = circulation === 'CounterClockwise' ? 'Leading' : 'Lagging';
    }

    // 7. Ellipse Parameters (PCA Eigenvalues of Covariance Matrix)
    // Trace = varX + varY, Det = varX * varY - covXY^2
    const trace = varX + varY;
    const det = varX * varY - covXY * covXY;
    const discriminant = Math.max(0, trace * trace - 4 * det);
    const lambda1 = Math.max(1e-12, (trace + Math.sqrt(discriminant)) / 2); // major
    const lambda2 = Math.max(1e-12, (trace - Math.sqrt(discriminant)) / 2); // minor

    const a = Math.sqrt(lambda1);
    const b = Math.sqrt(lambda2);
    const axialRatio = Math.min(1.0, b / Math.max(1e-9, a));
    const eccentricity = Math.sqrt(Math.max(0, 1.0 - (axialRatio * axialRatio)));

    // Tilt angle
    let tiltAngleRad = 0.5 * Math.atan2(2 * covXY, varX - varY);
    let tiltAngleDeg = (tiltAngleRad * 180.0) / Math.PI;

    return {
      phaseDiffDeg: isNaN(phaseDiffDeg) ? 0 : Math.round(phaseDiffDeg * 10) / 10,
      phaseDiffRad: isNaN(phaseDiffRad) ? 0 : phaseDiffRad,
      powerFactor: isNaN(powerFactor) ? 1.0 : Math.round(powerFactor * 1000) / 1000,
      powerFactorType,
      enclosedArea: absArea,
      cycleEnergy,
      circulation,
      axialRatio: Math.round(axialRatio * 1000) / 1000,
      eccentricity: Math.round(eccentricity * 1000) / 1000,
      tiltAngleDeg: Math.round(tiltAngleDeg * 10) / 10,
      estimatedCycles,
      frequencyRatio,
      xRms,
      yRms,
      xPeak: maxAbsX,
      yPeak: maxAbsY,
      xDc: meanX,
      yDc: meanY,
    };
  }

  /**
   * Synthesize magnetic flux linkage λ(t) = ∫ (v(t) - R·i(t)) dt
   * Uses trapezoidal integration with high-pass DC drift removal
   */
  static integrateFlux(
    voltage: number[],
    times: number[],
    rDrop: number = 0,
    current?: number[]
  ): number[] {
    const len = Math.min(voltage.length, times.length);
    if (len < 2) return new Array(len).fill(0);

    const flux = new Float64Array(len);
    let cumulativeFlux = 0.0;
    let sumFlux = 0.0;

    for (let i = 1; i < len; i++) {
      const dt = times[i] - times[i - 1];
      const vPrev = voltage[i - 1] - (current && rDrop > 0 ? current[i - 1] * rDrop : 0);
      const vCurr = voltage[i] - (current && rDrop > 0 ? current[i] * rDrop : 0);

      // Trapezoidal step
      cumulativeFlux += 0.5 * (vPrev + vCurr) * dt;
      flux[i] = cumulativeFlux;
      sumFlux += cumulativeFlux;
    }

    // High-pass detrending / DC removal so hysteresis loop stays centered
    const meanFlux = sumFlux / len;
    const centeredFlux: number[] = new Array(len);
    for (let i = 0; i < len; i++) {
      centeredFlux[i] = flux[i] - meanFlux;
    }

    return centeredFlux;
  }

  /**
   * Calculate directional arrows along orbit trajectory
   */
  static computeTrajectoryArrows(
    xVals: number[],
    yVals: number[],
    count: number = 8
  ): TrajectoryArrow[] {
    const len = Math.min(xVals.length, yVals.length);
    if (len < count * 3) return [];

    const arrows: TrajectoryArrow[] = [];
    const step = Math.floor(len / (count + 1));

    for (let k = 1; k <= count; k++) {
      const idx = k * step;
      if (idx >= 1 && idx < len - 1) {
        const dx = xVals[idx + 1] - xVals[idx - 1];
        const dy = yVals[idx + 1] - yVals[idx - 1];
        const dist = Math.hypot(dx, dy);
        if (dist > 1e-6) {
          arrows.push({
            x: xVals[idx],
            y: yVals[idx],
            angle: Math.atan2(dy, dx),
          });
        }
      }
    }

    return arrows;
  }

  private static emptyMetrics(): LissajousMetrics {
    return {
      phaseDiffDeg: 0,
      phaseDiffRad: 0,
      powerFactor: 1.0,
      powerFactorType: 'Unity',
      enclosedArea: 0,
      cycleEnergy: 0,
      circulation: 'Linear',
      axialRatio: 0,
      eccentricity: 1.0,
      tiltAngleDeg: 0,
      estimatedCycles: 1,
      frequencyRatio: '1:1',
      xRms: 0,
      yRms: 0,
      xPeak: 0,
      yPeak: 0,
      xDc: 0,
      yDc: 0,
    };
  }
}
