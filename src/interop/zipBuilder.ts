/**
 * PSCAD CLONE - Lightweight Zero-Dependency PKZip Archive Generator
 * Creates valid .zip and .fmu (Functional Mock-up Unit) binary packages.
 */

export interface ZipEntry {
  path: string;
  data: Uint8Array | string;
}

export class ZipBuilder {
  private entries: ZipEntry[] = [];

  public addFile(path: string, content: string | Uint8Array) {
    this.entries.push({ path: path.replace(/^\/+/, ''), data: content });
  }

  /**
   * Standard CRC-32 checksum calculation (Polynomial 0xEDB88320)
   */
  private static calculateCrc32(data: Uint8Array): number {
    let crc = 0 ^ -1;
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ ZipBuilder.crcTable[(crc ^ data[i]) & 0xff];
    }
    return (crc ^ -1) >>> 0;
  }

  private static crcTable: Uint32Array = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  /**
   * Build uncompressed (Store mode) PKZip binary archive Uint8Array
   */
  public buildZip(): Uint8Array {
    const encoder = new TextEncoder();
    const localFileHeaders: Uint8Array[] = [];
    const centralDirectoryHeaders: Uint8Array[] = [];
    let currentOffset = 0;

    for (const entry of this.entries) {
      const pathBytes = encoder.encode(entry.path);
      const dataBytes =
        typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
      const crc = ZipBuilder.calculateCrc32(dataBytes);
      const size = dataBytes.length;

      // 1. Local File Header (30 bytes + path length + data length)
      const localHeader = new Uint8Array(30 + pathBytes.length + size);
      const lv = new DataView(localHeader.buffer);

      lv.setUint32(0, 0x04034b50, true); // Local file header signature
      lv.setUint16(4, 20, true);         // Version needed to extract (2.0)
      lv.setUint16(6, 0, true);          // General purpose bit flag
      lv.setUint16(8, 0, true);          // Compression method (0 = store)
      lv.setUint16(10, 0, true);         // Last mod file time
      lv.setUint16(12, 0, true);         // Last mod file date
      lv.setUint32(14, crc, true);       // CRC-32
      lv.setUint32(18, size, true);      // Compressed size
      lv.setUint32(22, size, true);      // Uncompressed size
      lv.setUint16(26, pathBytes.length, true); // File name length
      lv.setUint16(28, 0, true);         // Extra field length

      localHeader.set(pathBytes, 30);
      localHeader.set(dataBytes, 30 + pathBytes.length);
      localFileHeaders.push(localHeader);

      // 2. Central Directory Header (46 bytes + path length)
      const centralHeader = new Uint8Array(46 + pathBytes.length);
      const cv = new DataView(centralHeader.buffer);

      cv.setUint32(0, 0x02014b50, true); // Central file header signature
      cv.setUint16(4, 20, true);         // Version made by
      cv.setUint16(6, 20, true);         // Version needed to extract
      cv.setUint16(8, 0, true);          // General purpose bit flag
      cv.setUint16(10, 0, true);         // Compression method (0 = store)
      cv.setUint16(12, 0, true);         // Last mod file time
      cv.setUint16(14, 0, true);         // Last mod file date
      cv.setUint32(16, crc, true);       // CRC-32
      cv.setUint32(20, size, true);      // Compressed size
      cv.setUint32(24, size, true);      // Uncompressed size
      cv.setUint16(28, pathBytes.length, true); // File name length
      cv.setUint16(30, 0, true);         // Extra field length
      cv.setUint16(32, 0, true);         // File comment length
      cv.setUint16(34, 0, true);         // Disk number start
      cv.setUint16(36, 0, true);         // Internal file attributes
      cv.setUint32(38, 0, true);         // External file attributes
      cv.setUint32(42, currentOffset, true); // Relative offset of local header

      centralHeader.set(pathBytes, 46);
      centralDirectoryHeaders.push(centralHeader);

      currentOffset += localHeader.length;
    }

    const centralDirectoryOffset = currentOffset;
    let centralDirectorySize = 0;
    for (const h of centralDirectoryHeaders) {
      centralDirectorySize += h.length;
    }

    // 3. End of Central Directory Record (22 bytes)
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);

    ev.setUint32(0, 0x06054b50, true); // End of central dir signature
    ev.setUint16(4, 0, true);          // Number of this disk
    ev.setUint16(6, 0, true);          // Disk where central directory starts
    ev.setUint16(8, this.entries.length, true);  // Number of central directory records on this disk
    ev.setUint16(10, this.entries.length, true); // Total number of central directory records
    ev.setUint32(12, centralDirectorySize, true); // Size of central directory
    ev.setUint32(16, centralDirectoryOffset, true); // Offset of start of central directory
    ev.setUint16(20, 0, true);         // Comment length

    // Assemble final buffer
    const totalLength =
      centralDirectoryOffset + centralDirectorySize + eocd.length;
    const finalBuffer = new Uint8Array(totalLength);
    let writeOffset = 0;

    for (const lh of localFileHeaders) {
      finalBuffer.set(lh, writeOffset);
      writeOffset += lh.length;
    }

    for (const ch of centralDirectoryHeaders) {
      finalBuffer.set(ch, writeOffset);
      writeOffset += ch.length;
    }

    finalBuffer.set(eocd, writeOffset);

    return finalBuffer;
  }
}
