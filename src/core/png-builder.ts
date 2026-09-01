/**
 * Standalone Pure-TypeScript PNG Generator
 * Zero-dependency, standards-compliant PNG builder that creates valid, viewable PNG images
 * in any environment (Browser, Node.js, JSDOM, Chrome Extension).
 */

export interface PNGOptions {
  width: number;
  height: number;
  backgroundColor?: [number, number, number, number]; // [R, G, B, A] 0-255
  headerColor?: [number, number, number, number];
  borderColor?: [number, number, number, number];
  label?: string;
}

export class PNGBuilder {
  private static crcTable: Uint32Array | null = null;

  private static getCrcTable(): Uint32Array {
    if (this.crcTable) return this.crcTable;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c >>> 0;
    }
    this.crcTable = table;
    return table;
  }

  private static crc32(buf: Uint8Array, offset = 0, length = buf.length): number {
    const table = this.getCrcTable();
    let crc = 0xffffffff;
    for (let i = offset; i < offset + length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private static adler32(buf: Uint8Array): number {
    let s1 = 1;
    let s2 = 0;
    for (let i = 0; i < buf.length; i++) {
      s1 = (s1 + buf[i]) % 65521;
      s2 = (s2 + s1) % 65521;
    }
    return ((s2 << 16) | s1) >>> 0;
  }

  /**
   * Generates a raw PNG binary Buffer/Uint8Array
   */
  public static createPNG(opts: PNGOptions): Uint8Array {
    const width = Math.max(1, Math.min(1920, Math.floor(opts.width)));
    const height = Math.max(1, Math.min(1080, Math.floor(opts.height)));
    const bg = opts.backgroundColor || [15, 23, 42, 255]; // #0f172a
    const headerBg = opts.headerColor || [56, 189, 248, 255]; // #38bdf8
    const border = opts.borderColor || [99, 102, 241, 255]; // #6366f1

    // Uncompressed RGBA scanlines (Filter byte 0x00 + 4 bytes per pixel)
    const scanlineLength = 1 + width * 4;
    const rawData = new Uint8Array(scanlineLength * height);

    const headerHeight = Math.min(30, Math.floor(height * 0.2));

    for (let y = 0; y < height; y++) {
      const rowOffset = y * scanlineLength;
      rawData[rowOffset] = 0; // Filter 0 (None)

      for (let x = 0; x < width; x++) {
        const pxOffset = rowOffset + 1 + x * 4;

        // Border pixel
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          rawData[pxOffset] = border[0];
          rawData[pxOffset + 1] = border[1];
          rawData[pxOffset + 2] = border[2];
          rawData[pxOffset + 3] = border[3];
        }
        // Header band
        else if (y < headerHeight) {
          rawData[pxOffset] = headerBg[0];
          rawData[pxOffset + 1] = headerBg[1];
          rawData[pxOffset + 2] = headerBg[2];
          rawData[pxOffset + 3] = headerBg[3];
        }
        // Body background
        else {
          rawData[pxOffset] = bg[0];
          rawData[pxOffset + 1] = bg[1];
          rawData[pxOffset + 2] = bg[2];
          rawData[pxOffset + 3] = bg[3];
        }
      }
    }

    // Wrap in uncompressed DEFLATE zlib stream
    const deflated = this.deflateUncompressed(rawData);

    // PNG Structure: Signature (8) + IHDR (25) + IDAT (12 + deflated.length) + IEND (12)
    const totalSize = 8 + 25 + (12 + deflated.length) + 12;
    const png = new Uint8Array(totalSize);
    let p = 0;

    // 1. Signature
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < signature.length; i++) png[p++] = signature[i];

    // 2. IHDR chunk
    const ihdrData = new Uint8Array(13);
    const ihdrView = new DataView(ihdrData.buffer);
    ihdrView.setUint32(0, width, false);
    ihdrView.setUint32(4, height, false);
    ihdrData[8] = 8; // Bit depth: 8
    ihdrData[9] = 6; // Color type: 6 (RGBA)
    ihdrData[10] = 0; // Compression: 0
    ihdrData[11] = 0; // Filter: 0
    ihdrData[12] = 0; // Interlace: 0
    p = this.writeChunk(png, p, 'IHDR', ihdrData);

    // 3. IDAT chunk
    p = this.writeChunk(png, p, 'IDAT', deflated);

    // 4. IEND chunk
    p = this.writeChunk(png, p, 'IEND', new Uint8Array(0));

    return png;
  }

  /**
   * Generates a valid Base64 data:image/png;base64,... URL
   */
  public static createDataUrl(opts: PNGOptions): string {
    const pngBytes = this.createPNG(opts);
    let binary = '';
    const len = pngBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(pngBytes[i]);
    }
    if (typeof btoa !== 'undefined') {
      return `data:image/png;base64,${btoa(binary)}`;
    }
    if (typeof Buffer !== 'undefined') {
      return `data:image/png;base64,${Buffer.from(pngBytes).toString('base64')}`;
    }
    return `data:image/png;base64,${btoa(binary)}`;
  }

  private static deflateUncompressed(data: Uint8Array): Uint8Array {
    // zlib header (0x78, 0x01 = low/no compression)
    const blocks: Uint8Array[] = [];
    const maxBlockSize = 65535;
    let offset = 0;

    while (offset < data.length) {
      const remaining = data.length - offset;
      const blockSize = Math.min(remaining, maxBlockSize);
      const isFinal = offset + blockSize >= data.length;

      const block = new Uint8Array(5 + blockSize);
      block[0] = isFinal ? 0x01 : 0x00; // BFINAL + BTYPE (00 = non-compressed)

      // LEN
      block[1] = blockSize & 0xff;
      block[2] = (blockSize >>> 8) & 0xff;
      // NLEN (~LEN)
      const nlen = (~blockSize) & 0xffff;
      block[3] = nlen & 0xff;
      block[4] = (nlen >>> 8) & 0xff;

      block.set(data.subarray(offset, offset + blockSize), 5);
      blocks.push(block);
      offset += blockSize;
    }

    const totalDeflated = blocks.reduce((sum, b) => sum + b.length, 0) + 2 + 4; // header(2) + adler(4)
    const result = new Uint8Array(totalDeflated);
    let p = 0;
    result[p++] = 0x78;
    result[p++] = 0x01;

    for (const b of blocks) {
      result.set(b, p);
      p += b.length;
    }

    // Adler-32
    const adler = this.adler32(data);
    result[p++] = (adler >>> 24) & 0xff;
    result[p++] = (adler >>> 16) & 0xff;
    result[p++] = (adler >>> 8) & 0xff;
    result[p++] = adler & 0xff;

    return result;
  }

  private static writeChunk(target: Uint8Array, offset: number, typeStr: string, data: Uint8Array): number {
    const len = data.length;
    const view = new DataView(target.buffer, target.byteOffset, target.byteLength);

    // Length
    view.setUint32(offset, len, false);
    offset += 4;

    // Type + Data buffer for CRC calculation
    const chunkTypeAndData = new Uint8Array(4 + len);
    for (let i = 0; i < 4; i++) {
      const code = typeStr.charCodeAt(i);
      target[offset + i] = code;
      chunkTypeAndData[i] = code;
    }
    offset += 4;

    // Data
    if (len > 0) {
      target.set(data, offset);
      chunkTypeAndData.set(data, 4);
      offset += len;
    }

    // CRC32
    const crc = this.crc32(chunkTypeAndData);
    view.setUint32(offset, crc, false);
    offset += 4;

    return offset;
  }
}
