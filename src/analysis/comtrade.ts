/**
 * PSCAD Modern - COMTRADE IEEE Std C37.111 Exporter & Importer
 * 
 * Supports IEEE C37.111-1999 and IEEE C37.111-2013 / IEC 60255-24:2013 standards
 * for exchange of transient fault and disturbance data in ASCII and BINARY formats.
 */

export interface ComtradeAnalogChannel {
  index: number;
  id: string;
  phase: string;
  ccbm: string;
  unit: string;
  a: number; // multiplier y = a*x + b
  b: number; // offset
  skew: number;
  min: number;
  max: number;
  primaryRatio: number;
  secondaryRatio: number;
  primarySecondary: 'P' | 'S';
}

export interface ComtradeDigitalChannel {
  index: number;
  id: string;
  phase: string;
  ccbm: string;
  normalState: number; // 0 or 1
}

export interface ComtradeExportConfig {
  stationName?: string;
  recDevId?: string;
  standardYear?: '1999' | '2013';
  format?: 'ASCII' | 'BINARY';
  nominalFreq?: number; // 50 or 60 Hz
  selectedChannels?: string[];
  digitalChannels?: { name: string; values: boolean[] }[];
  startTime?: Date;
  triggerTime?: Date;
}

export interface ComtradeRecord {
  stationName: string;
  recDevId: string;
  standardYear: '1999' | '2013';
  nominalFreq: number;
  format: 'ASCII' | 'BINARY';
  sampleRate: number;
  sampleCount: number;
  startTime: string;
  triggerTime: string;
  time: number[]; // seconds
  analogChannels: Map<string, number[]>;
  analogDefinitions: ComtradeAnalogChannel[];
  digitalChannels: Map<string, boolean[]>;
  digitalDefinitions: ComtradeDigitalChannel[];
}

export class ComtradeEngine {
  /**
   * Export simulation signals to IEEE C37.111 COMTRADE format (.cfg + .dat)
   */
  static exportComtrade(
    signals: Map<string, number[]>,
    config: ComtradeExportConfig = {}
  ): { cfg: string; datAscii?: string; datBinary?: ArrayBuffer; isBinary: boolean; baseFileName: string } {
    const stationName = (config.stationName || 'PSCAD_SUBSTATION').replace(/,/g, '_');
    const recDevId = (config.recDevId || 'EMTDC_RECORDER_01').replace(/,/g, '_');
    const standardYear = config.standardYear || '1999';
    const format = config.format || 'ASCII';
    const nominalFreq = config.nominalFreq || 60.0;
    const isBinary = format === 'BINARY';

    const times = signals.get('Time') || [];
    const sampleCount = times.length;
    if (sampleCount === 0) {
      throw new Error('No simulation time data available to export COMTRADE record.');
    }

    const dtAvg = sampleCount > 1 ? (times[sampleCount - 1] - times[0]) / (sampleCount - 1) : 50e-6;
    const sampleRate = Math.round(1.0 / Math.max(1e-7, dtAvg));

    // Determine analog channels
    const availableAnalog = Array.from(signals.keys()).filter(k => k !== 'Time');
    const selectedAnalog = config.selectedChannels && config.selectedChannels.length > 0
      ? config.selectedChannels.filter(ch => signals.has(ch) && ch !== 'Time')
      : availableAnalog;

    const numAnalog = selectedAnalog.length;
    const digitalList = config.digitalChannels || [];
    const numDigital = digitalList.length;
    const totalChannels = numAnalog + numDigital;

    // Build Analog Channel Definitions with Optimal 16-bit Integer Scaling
    const analogDefs: ComtradeAnalogChannel[] = [];
    const analogScaling: { a: number; b: number; minInt: number; maxInt: number }[] = [];

    for (let i = 0; i < selectedAnalog.length; i++) {
      const chName = selectedAnalog[i];
      const data = signals.get(chName) || [];

      let minVal = Infinity;
      let maxVal = -Infinity;
      for (let j = 0; j < data.length; j++) {
        if (data[j] < minVal) minVal = data[j];
        if (data[j] > maxVal) maxVal = data[j];
      }

      if (minVal === Infinity || maxVal === -Infinity) {
        minVal = -1.0;
        maxVal = 1.0;
      }
      if (Math.abs(maxVal - minVal) < 1e-9) {
        maxVal += 1.0;
        minVal -= 1.0;
      }

      // Scaling factor: y = a * x + b where x in [-32767, 32767]
      const span = maxVal - minVal;
      const a = span / 65534.0;
      const b = (maxVal + minVal) / 2.0;

      // Infer phase and unit
      let phase = 'A';
      if (chName.toLowerCase().includes('_b') || chName.toLowerCase().endsWith('b')) phase = 'B';
      else if (chName.toLowerCase().includes('_c') || chName.toLowerCase().endsWith('c')) phase = 'C';
      else if (chName.toLowerCase().includes('_n') || chName.toLowerCase().endsWith('n')) phase = 'N';

      let unit = 'V';
      if (chName.toLowerCase().includes('i_') || chName.toLowerCase().includes('curr') || chName.toLowerCase().endsWith('_i')) unit = 'A';
      else if (chName.toLowerCase().includes('p_') || chName.toLowerCase().includes('power')) unit = 'W';

      analogDefs.push({
        index: i + 1,
        id: chName.replace(/,/g, '_'),
        phase,
        ccbm: 'LINE_FEEDER_1',
        unit,
        a,
        b,
        skew: 0.0,
        min: -32767,
        max: 32767,
        primaryRatio: 1.0,
        secondaryRatio: 1.0,
        primarySecondary: 'S'
      });

      analogScaling.push({ a, b, minInt: -32767, maxInt: 32767 });
    }

    // Build Digital Channel Definitions
    const digitalDefs: ComtradeDigitalChannel[] = [];
    for (let i = 0; i < digitalList.length; i++) {
      digitalDefs.push({
        index: i + 1,
        id: digitalList[i].name.replace(/,/g, '_'),
        phase: '',
        ccbm: 'BREAKER_TRIP',
        normalState: 0
      });
    }

    // Generate Timestamps
    const now = config.startTime || new Date();
    const trig = config.triggerTime || now;
    const formatTimestamp = (d: Date, yr: '1999' | '2013') => {
      const pad = (n: number, z: number = 2) => n.toString().padStart(z, '0');
      const dd = pad(d.getDate());
      const mm = pad(d.getMonth() + 1);
      const yyyy = d.getFullYear();
      const hh = pad(d.getHours());
      const min = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      const micro = pad(d.getMilliseconds() * 1000, 6);

      if (yr === '1999') {
        return `${dd}/${mm}/${yyyy},${hh}:${min}:${ss}.${micro}`;
      }
      return `${yyyy}-${mm}-${dd},${hh}:${min}:${ss}.${micro}000000`;
    };

    const startTs = formatTimestamp(now, standardYear);
    const trigTs = formatTimestamp(trig, standardYear);

    // 1. Build .cfg File Content
    let cfg = '';
    // Line 1: Station, DevID, Year
    cfg += `${stationName},${recDevId},${standardYear}\n`;
    // Line 2: Channels (Total, Analog, Digital)
    cfg += `${totalChannels},${numAnalog}A,${numDigital}D\n`;

    // Analog Lines
    for (const a of analogDefs) {
      cfg += `${a.index},${a.id},${a.phase},${a.ccbm},${a.unit},${a.a.toExponential(7)},${a.b.toExponential(7)},${a.skew},${a.min},${a.max},${a.primaryRatio},${a.secondaryRatio},${a.primarySecondary}\n`;
    }

    // Digital Lines
    for (const d of digitalDefs) {
      cfg += `${d.index},${d.id},${d.phase},${d.ccbm},${d.normalState}\n`;
    }

    // Nominal Frequency
    cfg += `${nominalFreq.toFixed(1)}\n`;
    // Sample Rate definition
    cfg += `1\n`; // 1 sample rate partition
    cfg += `${sampleRate},${sampleCount}\n`;
    // Timestamps
    cfg += `${startTs}\n`;
    cfg += `${trigTs}\n`;
    // Data File Type & Time Multiplier
    cfg += `${format}\n`;
    cfg += `1.0\n`; // Time multiplication factor

    // 2. Build .dat File Content
    let datAscii: string | undefined;
    let datBinary: ArrayBuffer | undefined;

    if (!isBinary) {
      // ASCII FORMAT
      let datLines = '';
      for (let n = 0; n < sampleCount; n++) {
        const sampleIdx = n + 1;
        const microSec = Math.round(times[n] * 1e6);
        let row = `${sampleIdx},${microSec}`;

        for (let a = 0; a < numAnalog; a++) {
          const chName = selectedAnalog[a];
          const val = (signals.get(chName) || [])[n] || 0.0;
          // Scale to integer: x = (val - b) / a
          const { a: scaleA, b: scaleB } = analogScaling[a];
          const intVal = Math.round((val - scaleB) / Math.max(1e-15, scaleA));
          const clamped = Math.max(-32767, Math.min(32767, intVal));
          row += `,${clamped}`;
        }

        for (let d = 0; d < numDigital; d++) {
          const bitVal = digitalList[d].values[n] ? 1 : 0;
          row += `,${bitVal}`;
        }

        datLines += row + '\n';
      }
      datAscii = datLines;
    } else {
      // BINARY FORMAT (IEEE C37.111 Standard 16-bit packed)
      // Header per row: 4 bytes sample index (uint32) + 4 bytes microsecond timestamp (uint32)
      // Followed by: 2 bytes signed int16 per analog channel
      // Followed by: 2 bytes unsigned uint16 for every 16 digital channels (bitfield)
      const numDigitalWords = Math.ceil(numDigital / 16);
      const bytesPerRow = 4 + 4 + numAnalog * 2 + numDigitalWords * 2;
      const buffer = new ArrayBuffer(sampleCount * bytesPerRow);
      const view = new DataView(buffer);
      let offset = 0;

      for (let n = 0; n < sampleCount; n++) {
        const sampleIdx = n + 1;
        const microSec = Math.round(times[n] * 1e6);

        view.setUint32(offset, sampleIdx, true); // Little endian
        offset += 4;
        view.setUint32(offset, microSec, true);
        offset += 4;

        // Analog
        for (let a = 0; a < numAnalog; a++) {
          const chName = selectedAnalog[a];
          const val = (signals.get(chName) || [])[n] || 0.0;
          const { a: scaleA, b: scaleB } = analogScaling[a];
          const intVal = Math.round((val - scaleB) / Math.max(1e-15, scaleA));
          const clamped = Math.max(-32767, Math.min(32767, intVal));
          view.setInt16(offset, clamped, true);
          offset += 2;
        }

        // Digital words (packed 16 bits)
        for (let w = 0; w < numDigitalWords; w++) {
          let wordVal = 0;
          for (let b = 0; b < 16; b++) {
            const dIdx = w * 16 + b;
            if (dIdx < numDigital && digitalList[dIdx].values[n]) {
              wordVal |= 1 << b;
            }
          }
          view.setUint16(offset, wordVal, true);
          offset += 2;
        }
      }

      datBinary = buffer;
    }

    const baseFileName = `${stationName}_${standardYear}_${Date.now().toString().slice(-6)}`;

    return {
      cfg,
      datAscii,
      datBinary,
      isBinary,
      baseFileName
    };
  }

  /**
   * Import and parse a COMTRADE record (.cfg + .dat)
   */
  static importComtrade(cfgContent: string, datContent: string | ArrayBuffer): ComtradeRecord {
    const lines = cfgContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 6) {
      throw new Error('Invalid COMTRADE .cfg file: Insufficient header lines.');
    }

    // Line 1: Station, DevID, Year
    const line1 = lines[0].split(',');
    const stationName = line1[0] || 'Unknown';
    const recDevId = line1[1] || 'Device';
    const standardYear: '1999' | '2013' = (line1[2] && line1[2].includes('2013')) ? '2013' : '1999';

    // Line 2: Channels: Total, ##A, ##D
    const line2 = lines[1].split(',');
    const numAnalog = parseInt(line2[1]?.replace(/A/i, '') || '0');
    const numDigital = parseInt(line2[2]?.replace(/D/i, '') || '0');

    let curLine = 2;

    // Analog Channel Definitions
    const analogDefs: ComtradeAnalogChannel[] = [];
    for (let i = 0; i < numAnalog; i++) {
      const parts = lines[curLine++].split(',');
      analogDefs.push({
        index: parseInt(parts[0]) || i + 1,
        id: parts[1] || `Analog_${i + 1}`,
        phase: parts[2] || '',
        ccbm: parts[3] || '',
        unit: parts[4] || 'V',
        a: parseFloat(parts[5]) || 1.0,
        b: parseFloat(parts[6]) || 0.0,
        skew: parseFloat(parts[7]) || 0.0,
        min: parseFloat(parts[8]) || -32767,
        max: parseFloat(parts[9]) || 32767,
        primaryRatio: parseFloat(parts[10]) || 1.0,
        secondaryRatio: parseFloat(parts[11]) || 1.0,
        primarySecondary: (parts[12]?.toUpperCase() === 'P' ? 'P' : 'S')
      });
    }

    // Digital Channel Definitions
    const digitalDefs: ComtradeDigitalChannel[] = [];
    for (let i = 0; i < numDigital; i++) {
      const parts = lines[curLine++].split(',');
      digitalDefs.push({
        index: parseInt(parts[0]) || i + 1,
        id: parts[1] || `Digital_${i + 1}`,
        phase: parts[2] || '',
        ccbm: parts[3] || '',
        normalState: parseInt(parts[4]) || 0
      });
    }

    // Nominal Frequency
    const nominalFreq = parseFloat(lines[curLine++]) || 60.0;

    // Sampling Rates
    const nRates = parseInt(lines[curLine++]) || 1;
    let sampleRate = 20000;
    for (let i = 0; i < nRates; i++) {
      const parts = lines[curLine++].split(',');
      sampleRate = parseFloat(parts[0]) || 20000;
    }

    // Timestamps
    const startTime = lines[curLine++] || '';
    const triggerTime = lines[curLine++] || '';

    // Data Format (ASCII / BINARY)
    const formatStr = (lines[curLine++] || 'ASCII').toUpperCase();
    const format: 'ASCII' | 'BINARY' = formatStr.includes('BIN') ? 'BINARY' : 'ASCII';

    // Parse Data File
    const timeVector: number[] = [];
    const analogSignals: Map<string, number[]> = new Map();
    analogDefs.forEach(a => analogSignals.set(a.id, []));

    const digitalSignals: Map<string, boolean[]> = new Map();
    digitalDefs.forEach(d => digitalSignals.set(d.id, []));

    if (format === 'ASCII' || typeof datContent === 'string') {
      const datStr = typeof datContent === 'string' ? datContent : new TextDecoder().decode(datContent);
      const dataRows = datStr.split(/\r?\n/).map(r => r.trim()).filter(r => r.length > 0);

      for (let r = 0; r < dataRows.length; r++) {
        const tokens = dataRows[r].split(',');
        if (tokens.length < 2 + numAnalog) continue;

        const microSec = parseFloat(tokens[1]) || (r * (1e6 / sampleRate));
        timeVector.push(microSec * 1e-6);

        // Analog Values: y = a * x + b
        for (let a = 0; a < numAnalog; a++) {
          const intVal = parseFloat(tokens[2 + a]) || 0.0;
          const realVal = analogDefs[a].a * intVal + analogDefs[a].b;
          analogSignals.get(analogDefs[a].id)!.push(realVal);
        }

        // Digital Values
        for (let d = 0; d < numDigital; d++) {
          const bitVal = parseInt(tokens[2 + numAnalog + d]) === 1;
          digitalSignals.get(digitalDefs[d].id)!.push(bitVal);
        }
      }
    } else {
      // BINARY PARSING
      const buffer = datContent instanceof ArrayBuffer ? datContent : (datContent as any).buffer;
      const view = new DataView(buffer);
      const numDigitalWords = Math.ceil(numDigital / 16);
      const bytesPerRow = 4 + 4 + numAnalog * 2 + numDigitalWords * 2;
      const totalRows = Math.floor(buffer.byteLength / bytesPerRow);

      let offset = 0;
      for (let r = 0; r < totalRows; r++) {
        offset += 4; // skip sample index
        const microSec = view.getUint32(offset, true);
        offset += 4;
        timeVector.push(microSec * 1e-6);

        // Analog channels
        for (let a = 0; a < numAnalog; a++) {
          const rawInt = view.getInt16(offset, true);
          offset += 2;
          const realVal = analogDefs[a].a * rawInt + analogDefs[a].b;
          analogSignals.get(analogDefs[a].id)!.push(realVal);
        }

        // Digital channels
        for (let w = 0; w < numDigitalWords; w++) {
          const word = view.getUint16(offset, true);
          offset += 2;
          for (let b = 0; b < 16; b++) {
            const dIdx = w * 16 + b;
            if (dIdx < numDigital) {
              const isHigh = ((word >> b) & 1) === 1;
              digitalSignals.get(digitalDefs[dIdx].id)!.push(isHigh);
            }
          }
        }
      }
    }

    return {
      stationName,
      recDevId,
      standardYear,
      nominalFreq,
      format,
      sampleRate,
      sampleCount: timeVector.length,
      startTime,
      triggerTime,
      time: timeVector,
      analogChannels: analogSignals,
      analogDefinitions: analogDefs,
      digitalChannels: digitalSignals,
      digitalDefinitions: digitalDefs
    };
  }

  /**
   * Helper to trigger download of COMTRADE files in browser
   */
  static downloadFiles(
    baseName: string,
    cfgText: string,
    datAscii?: string,
    datBinary?: ArrayBuffer
  ): void {
    // 1. Download .cfg
    const cfgBlob = new Blob([cfgText], { type: 'text/plain' });
    const cfgUrl = URL.createObjectURL(cfgBlob);
    const aCfg = document.createElement('a');
    aCfg.href = cfgUrl;
    aCfg.download = `${baseName}.cfg`;
    aCfg.click();
    URL.revokeObjectURL(cfgUrl);

    // 2. Download .dat
    const datBlob = datBinary
      ? new Blob([datBinary], { type: 'application/octet-stream' })
      : new Blob([datAscii || ''], { type: 'text/plain' });
    const datUrl = URL.createObjectURL(datBlob);
    const aDat = document.createElement('a');
    aDat.href = datUrl;
    aDat.download = `${baseName}.dat`;
    aDat.click();
    URL.revokeObjectURL(datUrl);
  }
}
