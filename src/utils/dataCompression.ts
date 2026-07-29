import { gzipSync, gunzipSync } from "fflate";

export interface StoredData {
  compressed: boolean;
  data: string;
}

export interface DecompressedData {
  data: unknown;
  compressed: boolean;
  originalSize: number;
  storedSize: number;
}

export interface CompressedData {
  storedData: StoredData;
  originalSize: number;
}

/**
 * 🗜️ Compress data for storage, with automatic fallback for small data
 */
export function compressForStorage(data: unknown): StoredData {
  return compressForStorageWithMetadata(data).storedData;
}

export function compressForStorageWithMetadata(data: unknown): CompressedData {
  const jsonString = JSON.stringify(data);

  if (jsonString.length < 10240) {
    return {
      storedData: { compressed: false, data: jsonString },
      originalSize: jsonString.length,
    };
  }

  try {
    const bytes = new TextEncoder().encode(jsonString);
    const compressed = gzipSync(bytes, { level: 6, mtime: 0 });

    // Convert Uint8Array to base64 without using spread operator to avoid stack overflow on large arrays
    let binaryString = "";
    const chunkSize = 8192; // Process in chunks to avoid memory issues
    for (let i = 0; i < compressed.length; i += chunkSize) {
      const chunk = compressed.slice(i, i + chunkSize);
      // Process each byte individually to avoid stack overflow with apply()
      for (let j = 0; j < chunk.length; j++) {
        binaryString += String.fromCharCode(chunk[j]);
      }
    }
    const base64 = btoa(binaryString);

    if (base64.length < jsonString.length * 0.9) {
      return {
        storedData: { compressed: true, data: base64 },
        originalSize: jsonString.length,
      };
    }
  } catch (error) {
    console.warn("[Compression] Failed to compress data:", error);
  }

  return {
    storedData: { compressed: false, data: jsonString },
    originalSize: jsonString.length,
  };
}

/**
 * 🎈 Decompress data from storage
 */
export function decompressFromStorage(storedData: any): any {
  return decompressFromStorageWithMetadata(storedData).data;
}

export function decompressFromStorageWithMetadata(storedData: unknown): DecompressedData {
  if (
    typeof storedData !== "object" ||
    storedData === null ||
    !("compressed" in storedData) ||
    !("data" in storedData) ||
    typeof storedData.compressed !== "boolean" ||
    typeof storedData.data !== "string"
  ) {
    const serializedData = JSON.stringify(storedData);
    return {
      data: storedData,
      compressed: false,
      originalSize: serializedData?.length ?? 0,
      storedSize: serializedData?.length ?? 0,
    };
  }

  const storedSize = storedData.data.length;

  if (!storedData.compressed) {
    try {
      const data = JSON.parse(storedData.data);
      return {
        data,
        compressed: false,
        originalSize: storedData.data.length,
        storedSize,
      };
    } catch {
      return {
        data: storedData,
        compressed: false,
        originalSize: storedSize,
        storedSize,
      };
    }
  }

  try {
    const base64 = storedData.data;
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    const chunkSize = 32768;
    for (let i = 0; i < len; i += chunkSize) {
      const end = Math.min(i + chunkSize, len);
      for (let j = i; j < end; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }
    }

    const decompressed = gunzipSync(bytes);
    const jsonString = new TextDecoder().decode(decompressed);
    return {
      data: JSON.parse(jsonString),
      compressed: true,
      originalSize: jsonString.length,
      storedSize,
    };
  } catch (error) {
    console.error("[Compression] Failed to decompress data:", error);
    if (typeof storedData.data === "string") {
      try {
        const data = JSON.parse(storedData.data);
        return {
          data,
          compressed: true,
          originalSize: storedData.data.length,
          storedSize,
        };
      } catch {
        return {
          data: storedData,
          compressed: true,
          originalSize: storedSize,
          storedSize,
        };
      }
    }
    return {
      data: storedData,
      compressed: true,
      originalSize: storedSize,
      storedSize,
    };
  }
}

/**
 * 📊 Calculate the compression ratio
 */
function getCompressionRatio(original: string, compressed: string): number {
  if (original.length === 0) return 1;
  return compressed.length / original.length;
}

/**
 * 📏 Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * 💾 Check if there's enough storage quota available
 */
export async function checkStorageQuota(
  requiredBytes: number,
): Promise<{ hasSpace: boolean; available?: number; used?: number }> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { hasSpace: true };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const available = quota - usage;

    const requiredWithBuffer = requiredBytes * 1.1;

    return {
      hasSpace: available > requiredWithBuffer,
      available,
      used: usage,
    };
  } catch (error) {
    console.warn("[Storage] Failed to estimate storage quota:", error);
    return { hasSpace: true };
  }
}
