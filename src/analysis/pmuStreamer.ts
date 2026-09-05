/**
 * PSCAD CLONE - IEEE C37.118 Synchrophasor PMU Streaming Engine
 * Implements IEEE Std C37.118.1a-2014 (Measurement) & IEEE Std C37.118.2-2011 (Data Transfer).
 */

export interface PhasorValue {
  magnitude: number; // RMS Magnitude (kV or kA)
  angleDeg: number;  // Phase Angle in degrees (-180 to +180)
  real: number;
  imag: number;
}

export interface PmuFrameData {
  pmuId: number;
  stationName: string;
  timestamp: number; // Unix timestamp in seconds
  soc: number;       // Second of Century (Unix epoch sec)
  fracSec: number;   // Fraction of second (microsecond precision)
  nominalFreq: number; // 50 or 60 Hz
  frequency: number;   // Actual measured frequency in Hz
  freqDevHz: number;   // Deviation from nominal in Hz
  rocof: number;       // Rate of Change of Frequency (Hz/s)
  phasors: Record<string, PhasorValue>;
  analogValues: number[];
  digitalWord: number;
  statWord: number;
  rawHexFrame: string;
  crcValid: boolean;
  tvePercent: number;
}

export interface PmuStationConfig {
  pmuId: number;
  stationName: string;
  nominalFreq: number; // 50 or 60 Hz
  reportingRate: number; // 10, 25, 50, 60, 100, 120 fps
  dataStreamId: number;
  channels: Array<{
    id: string;
    name: string;
    type: 'voltage' | 'current';
    unit: string;
    scaleFactor: number;
  }>;
}

export class PmuStreamer {
  private static instance: PmuStreamer;
  private config: PmuStationConfig = {
    pmuId: 101,
    stationName: 'SUBSTATION_NORTH_400KV',
    nominalFreq: 60.0,
    reportingRate: 60,
    dataStreamId: 1,
    channels: [
      { id: 'VA', name: 'Bus 1 Phase A Voltage', type: 'voltage', unit: 'kV', scaleFactor: 1.0 },
      { id: 'VB', name: 'Bus 1 Phase B Voltage', type: 'voltage', unit: 'kV', scaleFactor: 1.0 },
      { id: 'VC', name: 'Bus 1 Phase C Voltage', type: 'voltage', unit: 'kV', scaleFactor: 1.0 },
      { id: 'IA', name: 'Line 1-2 Phase A Current', type: 'current', unit: 'kA', scaleFactor: 1.0 },
      { id: 'IB', name: 'Line 1-2 Phase B Current', type: 'current', unit: 'kA', scaleFactor: 1.0 },
      { id: 'IC', name: 'Line 1-2 Phase C Current', type: 'current', unit: 'kA', scaleFactor: 1.0 },
    ],
  };

  private isStreaming: boolean = false;
  private timerId: any = null;
  private listeners: Array<(frame: PmuFrameData) => void> = [];
  private lastTime: number = 0;
  private lastFreq: number = 60.0;


  private constructor() {}

  public static getInstance(): PmuStreamer {
    if (!PmuStreamer.instance) {
      PmuStreamer.instance = new PmuStreamer();
    }
    return PmuStreamer.instance;
  }

  public getConfig(): PmuStationConfig {
    return { ...this.config };
  }

  public setConfig(cfg: Partial<PmuStationConfig>) {
    this.config = { ...this.config, ...cfg };
  }

  /**
   * CRC-16-CCITT generator for IEEE C37.118 (Polynomial 0x1021, Init 0xFFFF)
   */
  public static calculateCrc16(bytes: Uint8Array, length: number): number {
    let crc = 0xffff;
    for (let i = 0; i < length; i++) {
      crc ^= bytes[i] << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }
    return crc;
  }

  /**
   * Synchrophasor Estimation using Recursive DFT over simulated instantaneous waveforms
   */
  public computePhasor(
    waveformSamples: Float64Array | number[],
    sampleRate: number,
    nominalFreq: number
  ): PhasorValue {
    const n = waveformSamples.length;
    if (n === 0) {
      return { magnitude: 0, angleDeg: 0, real: 0, imag: 0 };
    }

    const samplesPerCycle = Math.max(1, Math.round(sampleRate / nominalFreq));
    const windowSize = Math.min(n, samplesPerCycle);
    const startIdx = n - windowSize;

    let realSum = 0;
    let imagSum = 0;

    for (let i = 0; i < windowSize; i++) {
      const sample = waveformSamples[startIdx + i];
      const theta = (2 * Math.PI * i) / samplesPerCycle;
      // Hanning window weighting
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / windowSize));
      const val = sample * w;
      realSum += val * Math.cos(theta);
      imagSum -= val * Math.sin(theta);
    }

    // Scaling factor for Hanning windowed RMS
    const scale = (2.0 / windowSize) * Math.SQRT1_2 * 2.0;
    const real = realSum * scale;
    const imag = imagSum * scale;
    const magnitude = Math.sqrt(real * real + imag * imag);
    const angleRad = Math.atan2(imag, real);
    const angleDeg = (angleRad * 180) / Math.PI;

    return {
      magnitude,
      angleDeg,
      real,
      imag,
    };
  }

  /**
   * Synthesize IEEE C37.118 Binary Data Frame
   */
  public encodeDataFrame(
    timeSec: number,
    phasorMap: Record<string, PhasorValue>,
    measuredFreq: number,
    rocofVal: number
  ): { buffer: Uint8Array; hexString: string } {
    const numPhasors = this.config.channels.length;
    const numAnalog = 2;
    const numDigital = 1;

    // Frame size calculation:
    // SYNC(2) + FRAMESIZE(2) + IDCODE(2) + SOC(4) + FRACSEC(4) + STAT(2) + PHASORS(numPhasors * 8) + FREQ(4) + DFREQ(4) + ANALOG(numAnalog * 4) + DIGITAL(numDigital * 2) + CHK(2)
    const frameSize = 2 + 2 + 2 + 4 + 4 + 2 + numPhasors * 8 + 4 + 4 + numAnalog * 4 + numDigital * 2 + 2;
    const buffer = new Uint8Array(frameSize);
    const view = new DataView(buffer.buffer);

    let offset = 0;

    // 1. SYNC word (0xAA01 for DATA frame)
    view.setUint16(offset, 0xaa01, false);
    offset += 2;

    // 2. FRAMESIZE
    view.setUint16(offset, frameSize, false);
    offset += 2;

    // 3. IDCODE
    view.setUint16(offset, this.config.pmuId, false);
    offset += 2;

    // 4. SOC (Second of Century)
    const soc = Math.floor(timeSec);
    view.setUint32(offset, soc, false);
    offset += 4;

    // 5. FRACSEC (Fraction of Second + Time Quality Flags)
    const frac = Math.floor((timeSec - soc) * 1000000);
    view.setUint32(offset, frac & 0x00ffffff, false);
    offset += 4;

    // 6. STAT word (0x0000 = Data Valid, Sync Normal)
    view.setUint16(offset, 0x0000, false);
    offset += 2;

    // 7. PHASORS (32-bit Floating Point Real & Imag)
    for (const ch of this.config.channels) {
      const ph = phasorMap[ch.id] || { real: 0, imag: 0 };
      view.setFloat32(offset, ph.real, false);
      offset += 4;
      view.setFloat32(offset, ph.imag, false);
      offset += 4;
    }

    // 8. FREQ (Frequency Deviation from Nominal in Hz - IEEE 754 Float32)
    const freqDev = measuredFreq - this.config.nominalFreq;
    view.setFloat32(offset, freqDev, false);
    offset += 4;

    // 9. DFREQ (ROCOF in Hz/s - IEEE 754 Float32)
    view.setFloat32(offset, rocofVal, false);
    offset += 4;

    // 10. ANALOG Channels
    view.setFloat32(offset, 1.05, false); // Active Power MW
    offset += 4;
    view.setFloat32(offset, 0.22, false); // Reactive Power MVAR
    offset += 4;

    // 11. DIGITAL Word
    view.setUint16(offset, 0x0001, false); // Breaker Closed
    offset += 2;

    // 12. CRC-16 Checksum
    const crc = PmuStreamer.calculateCrc16(buffer, offset);
    view.setUint16(offset, crc, false);

    // Build formatted hex dump string
    let hexString = '';
    for (let i = 0; i < buffer.length; i++) {
      hexString += buffer[i].toString(16).padStart(2, '0').toUpperCase() + ' ';
      if ((i + 1) % 16 === 0) hexString += '\n';
    }

    return { buffer, hexString };
  }

  /**
   * Start live simulated synchrophasor stream
   */
  public startStreaming(onFrame?: (frame: PmuFrameData) => void) {
    if (this.isStreaming) return;
    this.isStreaming = true;

    if (onFrame) {
      this.listeners.push(onFrame);
    }

    const intervalMs = Math.max(10, Math.floor(1000 / this.config.reportingRate));
    let t = Date.now() / 1000;
    this.lastTime = t;

    this.timerId = setInterval(() => {
      t += 1.0 / this.config.reportingRate;
      const dt = t - this.lastTime;
      this.lastTime = t;

      // Realistic grid dynamics: slight nominal frequency oscillation + ROCOF
      const freqNoise = 0.04 * Math.sin(2 * Math.PI * 0.25 * t) + 0.01 * Math.cos(2 * Math.PI * 1.2 * t);
      const currentFreq = this.config.nominalFreq + freqNoise;
      const rocof = (currentFreq - this.lastFreq) / (dt > 0 ? dt : 1 / 60);
      this.lastFreq = currentFreq;

      const omega = 2 * Math.PI * currentFreq;
      const phasorMap: Record<string, PhasorValue> = {};

      // Calculate 3-phase voltages
      const vMag = 230.0 + 1.2 * Math.sin(2 * Math.PI * 0.1 * t);
      const vaAngle = ((omega * t) % (2 * Math.PI)) * (180 / Math.PI) - 180;
      const vbAngle = ((omega * t - (2 * Math.PI) / 3) % (2 * Math.PI)) * (180 / Math.PI) - 180;
      const vcAngle = ((omega * t + (2 * Math.PI) / 3) % (2 * Math.PI)) * (180 / Math.PI) - 180;

      phasorMap['VA'] = {
        magnitude: vMag,
        angleDeg: vaAngle,
        real: vMag * Math.cos((vaAngle * Math.PI) / 180),
        imag: vMag * Math.sin((vaAngle * Math.PI) / 180),
      };
      phasorMap['VB'] = {
        magnitude: vMag,
        angleDeg: vbAngle,
        real: vMag * Math.cos((vbAngle * Math.PI) / 180),
        imag: vMag * Math.sin((vbAngle * Math.PI) / 180),
      };
      phasorMap['VC'] = {
        magnitude: vMag,
        angleDeg: vcAngle,
        real: vMag * Math.cos((vcAngle * Math.PI) / 180),
        imag: vMag * Math.sin((vcAngle * Math.PI) / 180),
      };

      // Calculate 3-phase currents (lagging power factor ~0.92)
      const iMag = 1.45 + 0.08 * Math.cos(2 * Math.PI * 0.15 * t);
      const lag = 23.0; // degrees
      phasorMap['IA'] = {
        magnitude: iMag,
        angleDeg: vaAngle - lag,
        real: iMag * Math.cos(((vaAngle - lag) * Math.PI) / 180),
        imag: iMag * Math.sin(((vaAngle - lag) * Math.PI) / 180),
      };
      phasorMap['IB'] = {
        magnitude: iMag,
        angleDeg: vbAngle - lag,
        real: iMag * Math.cos(((vbAngle - lag) * Math.PI) / 180),
        imag: iMag * Math.sin(((vbAngle - lag) * Math.PI) / 180),
      };
      phasorMap['IC'] = {
        magnitude: iMag,
        angleDeg: vcAngle - lag,
        real: iMag * Math.cos(((vcAngle - lag) * Math.PI) / 180),
        imag: iMag * Math.sin(((vcAngle - lag) * Math.PI) / 180),
      };

      const { hexString } = this.encodeDataFrame(t, phasorMap, currentFreq, rocof);

      const soc = Math.floor(t);
      const fracSec = Math.floor((t - soc) * 1000000);

      const frameData: PmuFrameData = {
        pmuId: this.config.pmuId,
        stationName: this.config.stationName,
        timestamp: t,
        soc,
        fracSec,
        nominalFreq: this.config.nominalFreq,
        frequency: currentFreq,
        freqDevHz: currentFreq - this.config.nominalFreq,
        rocof,
        phasors: phasorMap,
        analogValues: [245.2, 45.1],
        digitalWord: 0x0001,
        statWord: 0x0000,
        rawHexFrame: hexString,
        crcValid: true,
        tvePercent: 0.12,
      };

      this.listeners.forEach((cb) => cb(frameData));
    }, intervalMs);
  }

  /**
   * Stop streaming
   */
  public stopStreaming() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isStreaming = false;
    this.listeners = [];
  }

  public getIsStreaming(): boolean {
    return this.isStreaming;
  }
}

export const pmuStreamer = PmuStreamer.getInstance();
