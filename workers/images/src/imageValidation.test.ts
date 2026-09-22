import { describe, expect, it } from "vitest";
import {
  ImageFormat,
  ImageRejection,
  inspectImageBytes,
  maximumImageBytes,
  maximumImageDimension,
  maximumImagePixels,
} from "./imageValidation.ts";

const pngBytes = (width: number, height: number, byteLength = 24): Uint8Array => {
  const bytes = new Uint8Array(byteLength);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  if (byteLength < 24) return bytes;

  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13);
  bytes.set(new TextEncoder().encode("IHDR"), 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
};

const gifBytes = (width: number, height: number, version = "GIF89a"): Uint8Array => {
  const bytes = new Uint8Array(13);
  bytes.set(new TextEncoder().encode(version), 0);
  const view = new DataView(bytes.buffer);
  view.setUint16(6, width, true);
  view.setUint16(8, height, true);
  return bytes;
};

interface JpegOptions {
  readonly includeApplicationSegment?: boolean;
  readonly startOfFrameMarker?: number;
}

const jpegBytes = (width: number, height: number, options: JpegOptions = {}): Uint8Array => {
  const bytes: number[] = [0xff, 0xd8];
  if (options.includeApplicationSegment ?? true) {
    bytes.push(0xff, 0xe0, 0x00, 0x10, ...new Uint8Array(14));
  }
  bytes.push(
    0xff,
    options.startOfFrameMarker ?? 0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    ...new Uint8Array(9),
  );
  return new Uint8Array(bytes);
};

describe("inspectImageBytes", () => {
  it("accepts a PNG and reports its format and dimensions", () => {
    expect(inspectImageBytes(pngBytes(1920, 1080))).toEqual({
      ok: true,
      format: ImageFormat.Png,
      contentType: "image/png",
      width: 1920,
      height: 1080,
    });
  });

  it.each([
    ["GIF89a", "GIF89a"],
    ["GIF87a", "GIF87a"],
  ])("accepts a %s image and reports its format and dimensions", (_description, version) => {
    expect(inspectImageBytes(gifBytes(640, 480, version))).toEqual({
      ok: true,
      format: ImageFormat.Gif,
      contentType: "image/gif",
      width: 640,
      height: 480,
    });
  });

  it("accepts a baseline JPEG and reports its format and dimensions", () => {
    expect(inspectImageBytes(jpegBytes(800, 600))).toEqual({
      ok: true,
      format: ImageFormat.Jpeg,
      contentType: "image/jpeg",
      width: 800,
      height: 600,
    });
  });

  it("accepts a progressive JPEG whose frame header follows other segments", () => {
    const bytes = jpegBytes(300, 200, { startOfFrameMarker: 0xc2 });

    expect(inspectImageBytes(bytes)).toMatchObject({ ok: true, width: 300, height: 200 });
  });

  it("accepts a JPEG with no application segment before the frame header", () => {
    const bytes = jpegBytes(64, 32, { includeApplicationSegment: false });

    expect(inspectImageBytes(bytes)).toMatchObject({ ok: true, width: 64, height: 32 });
  });

  it("rejects an empty body", () => {
    expect(inspectImageBytes(new Uint8Array(0))).toEqual({
      ok: false,
      reason: ImageRejection.Empty,
    });
  });

  it.each([
    ["a PDF", [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]],
    ["HTML", [...new TextEncoder().encode("<!doctype html>")]],
    [
      "WebP",
      [...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBP")],
    ],
  ])("rejects %s as an unsupported format", (_description, byteValues) => {
    expect(inspectImageBytes(new Uint8Array(byteValues))).toEqual({
      ok: false,
      reason: ImageRejection.UnsupportedFormat,
    });
  });

  it("rejects a PNG whose header is truncated before the dimensions", () => {
    expect(inspectImageBytes(pngBytes(10, 10, 16))).toEqual({
      ok: false,
      reason: ImageRejection.Malformed,
    });
  });

  it("rejects a JPEG with no frame header", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, ...new Uint8Array(14)]);

    expect(inspectImageBytes(bytes)).toEqual({ ok: false, reason: ImageRejection.Malformed });
  });

  it.each([
    ["zero width", 0, 100],
    ["zero height", 100, 0],
  ])("rejects a PNG with %s", (_description, width, height) => {
    expect(inspectImageBytes(pngBytes(width, height))).toEqual({
      ok: false,
      reason: ImageRejection.Malformed,
    });
  });

  it("rejects an image wider than the dimension limit", () => {
    const bytes = pngBytes(maximumImageDimension + 1, 10);

    expect(inspectImageBytes(bytes)).toEqual({
      ok: false,
      reason: ImageRejection.DimensionsTooLarge,
    });
  });

  it("rejects an image whose pixel area exceeds the decompression limit", () => {
    const side = maximumImageDimension;
    expect(side * side).toBeGreaterThan(maximumImagePixels);

    expect(inspectImageBytes(pngBytes(side, side))).toEqual({
      ok: false,
      reason: ImageRejection.DimensionsTooLarge,
    });
  });

  it("rejects a body larger than the byte limit", () => {
    const bytes = new Uint8Array(maximumImageBytes + 1);
    bytes.set(pngBytes(10, 10), 0);

    expect(inspectImageBytes(bytes)).toEqual({ ok: false, reason: ImageRejection.TooLarge });
  });
});
