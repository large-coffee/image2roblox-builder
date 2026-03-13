import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { clamp } from "@image2roblox/shared";
import type { SourceImage } from "@image2roblox/schemas";

export interface ImageCueSummary {
  brightness: number;
  hue: number;
  saturation: number;
  aspectRatio: number;
  seed: number;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(clamp(Math.round(b), 0, 255))}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = 60 * (((gn - bn) / d) % 6);
        break;
      case gn:
        h = 60 * ((bn - rn) / d + 2);
        break;
      default:
        h = 60 * ((rn - gn) / d + 4);
        break;
    }
  }

  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}

function detectMimeType(filePath: string, buffer: Buffer): string {
  const ext = path.extname(filePath).toLowerCase();
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return "image/jpeg";
  }
  if (ext === ".webp") return "image/webp";
  if (ext === ".bmp") return "image/bmp";
  return "application/octet-stream";
}

function parsePngSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.slice(0, 8).equals(signature)) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function parseJpegSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (!marker) break;

    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    const length = buffer.readUInt16BE(offset + 2);

    if (isSOF) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }

    if (length <= 2) break;
    offset += 2 + length;
  }

  return null;
}

export function readImageSize(buffer: Buffer): { width: number; height: number } {
  const pngSize = parsePngSize(buffer);
  if (pngSize) return pngSize;

  const jpegSize = parseJpegSize(buffer);
  if (jpegSize) return jpegSize;

  return { width: 1024, height: 768 };
}

export function derivePalette(buffer: Buffer, count = 5): string[] {
  const palette = new Set<string>();

  for (let i = 0; i < count * 2; i += 1) {
    const offset = Math.floor(((i + 1) / (count * 2 + 1)) * (buffer.length - 3));
    const r = clamp(buffer[offset] + 20, 0, 255);
    const g = clamp(buffer[offset + 1] + 20, 0, 255);
    const b = clamp(buffer[offset + 2] + 20, 0, 255);
    palette.add(rgbToHex(r, g, b));
    if (palette.size >= count) break;
  }

  if (palette.size < 3) {
    palette.add("#4f7cac");
    palette.add("#d99267");
    palette.add("#f2e8cf");
  }

  return [...palette].slice(0, count);
}

export function summarizeImageCues(sourceImage: SourceImage): ImageCueSummary {
  const [primary] = sourceImage.palette;
  const r = parseInt(primary.slice(1, 3), 16);
  const g = parseInt(primary.slice(3, 5), 16);
  const b = parseInt(primary.slice(5, 7), 16);
  const hsl = rgbToHsl(r, g, b);

  const seedBase = `${sourceImage.originalName}:${sourceImage.width}x${sourceImage.height}:${sourceImage.palette.join(",")}`;
  const hash = crypto.createHash("sha1").update(seedBase).digest("hex");
  const seed = parseInt(hash.slice(0, 8), 16);

  return {
    brightness: hsl.l,
    hue: hsl.h,
    saturation: hsl.s,
    aspectRatio: sourceImage.width / sourceImage.height,
    seed
  };
}

export function inspectImageFile(filePath: string, originalName: string): SourceImage {
  const buffer = fs.readFileSync(filePath);
  const { width, height } = readImageSize(buffer);
  const mimeType = detectMimeType(filePath, buffer);
  const palette = derivePalette(buffer, 5);

  return {
    originalName,
    storedPath: filePath,
    mimeType,
    width,
    height,
    sizeBytes: buffer.byteLength,
    palette
  };
}

export function seededPick<T>(seed: number, values: readonly T[], salt = 0): T {
  if (values.length === 0) {
    throw new Error("seededPick called with empty array");
  }
  const index = Math.abs((seed + salt * 7919) % values.length);
  return values[index];
}

export function seededRange(seed: number, min: number, max: number, salt = 0): number {
  const span = max - min + 1;
  return min + Math.abs((seed + salt * 104729) % span);
}

export function inferBiome(hue: number): string {
  if (hue >= 80 && hue < 160) return "verdant highlands";
  if (hue >= 160 && hue < 220) return "coastal frontier";
  if (hue >= 220 && hue < 280) return "frosted mountains";
  if (hue >= 20 && hue < 80) return "sun-scorched canyon";
  return "volcanic wilds";
}

export function inferMood(brightness: number, saturation: number): string {
  if (brightness < 35) return "ominous and tense";
  if (brightness > 70 && saturation < 40) return "calm and mysterious";
  if (brightness > 60) return "hopeful and adventurous";
  return "rugged and determined";
}

export function inferLighting(brightness: number): string {
  if (brightness < 30) return "low-key dramatic lighting";
  if (brightness > 70) return "bright diffuse daylight";
  return "golden-hour contrast lighting";
}

export function inferGenreTags(biome: string, mood: string): string[] {
  const tags = ["adventure"];
  if (biome.includes("volcanic")) tags.push("survival", "hazards");
  if (biome.includes("coastal")) tags.push("exploration", "collection");
  if (biome.includes("frosted")) tags.push("puzzle", "navigation");
  if (mood.includes("ominous")) tags.push("threat");
  return [...new Set(tags)];
}
