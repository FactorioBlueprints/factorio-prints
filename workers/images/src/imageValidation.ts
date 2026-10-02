export const maximumImageBytes = 10 * 1024 * 1024;
export const maximumImageDimension = 12_000;
export const maximumImagePixels = 100_000_000;

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const pngHeaderLength = 24;
const gifHeaderLength = 10;
const jpegSignature = [0xff, 0xd8, 0xff] as const;

export enum ImageFormat {
  Gif = "gif",
  Jpeg = "jpeg",
  Png = "png",
}

export enum ImageRejection {
  DimensionsTooLarge = "dimensions-too-large",
  Empty = "empty",
  Malformed = "malformed",
  TooLarge = "too-large",
  UnsupportedFormat = "unsupported-format",
}

const imageContentTypes: Record<ImageFormat, string> = {
  [ImageFormat.Gif]: "image/gif",
  [ImageFormat.Jpeg]: "image/jpeg",
  [ImageFormat.Png]: "image/png",
};

export type ImageInspection =
  | {
      readonly ok: true;
      readonly contentType: string;
      readonly format: ImageFormat;
      readonly height: number;
      readonly width: number;
    }
  | { readonly ok: false; readonly reason: ImageRejection };

interface ImageDimensions {
  readonly height: number;
  readonly width: number;
}

const startsWith = (bytes: Uint8Array, signature: readonly number[]): boolean =>
  bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);

const startsWithText = (bytes: Uint8Array, text: string): boolean =>
  startsWith(bytes, [...new TextEncoder().encode(text)]);

const readPngDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (bytes.length < pngHeaderLength) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const readGifDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  if (bytes.length < gifHeaderLength) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
};

const isStartOfFrameMarker = (marker: number): boolean =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

const readJpegDimensions = (bytes: Uint8Array): ImageDimensions | null => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;

  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;

    let markerOffset = offset + 1;
    while (markerOffset < bytes.length && bytes[markerOffset] === 0xff) markerOffset += 1;
    if (markerOffset >= bytes.length) return null;

    const marker = bytes[markerOffset]!;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset = markerOffset + 1;
      continue;
    }

    if (markerOffset + 3 >= bytes.length) return null;
    if (isStartOfFrameMarker(marker)) {
      if (markerOffset + 8 >= bytes.length) return null;
      return {
        height: view.getUint16(markerOffset + 4),
        width: view.getUint16(markerOffset + 6),
      };
    }

    offset = markerOffset + 1 + view.getUint16(markerOffset + 1);
  }
  return null;
};

const detect = (
  bytes: Uint8Array,
): { format: ImageFormat; dimensions: ImageDimensions | null } | null => {
  if (startsWith(bytes, pngSignature)) {
    return { format: ImageFormat.Png, dimensions: readPngDimensions(bytes) };
  }
  if (startsWithText(bytes, "GIF89a") || startsWithText(bytes, "GIF87a")) {
    return { format: ImageFormat.Gif, dimensions: readGifDimensions(bytes) };
  }
  if (startsWith(bytes, jpegSignature)) {
    return { format: ImageFormat.Jpeg, dimensions: readJpegDimensions(bytes) };
  }
  return null;
};

export const inspectImageBytes = (bytes: Uint8Array): ImageInspection => {
  if (bytes.length === 0) return { ok: false, reason: ImageRejection.Empty };
  if (bytes.length > maximumImageBytes) return { ok: false, reason: ImageRejection.TooLarge };

  const detected = detect(bytes);
  if (!detected) return { ok: false, reason: ImageRejection.UnsupportedFormat };

  const dimensions = detected.dimensions;
  if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
    return { ok: false, reason: ImageRejection.Malformed };
  }
  if (
    dimensions.width > maximumImageDimension ||
    dimensions.height > maximumImageDimension ||
    dimensions.width * dimensions.height > maximumImagePixels
  ) {
    return { ok: false, reason: ImageRejection.DimensionsTooLarge };
  }

  return {
    ok: true,
    format: detected.format,
    contentType: imageContentTypes[detected.format],
    width: dimensions.width,
    height: dimensions.height,
  };
};
