import {gzipSync, gunzipSync} from 'fflate';

/**
 * 🗜️ Compress data for storage, with automatic fallback for small data
 */
export function compressForStorage(data: any): {compressed: boolean; data: string} {
	const jsonString = JSON.stringify(data);

	// Don't compress small data (under 10KB)
	if (jsonString.length < 10240) {
		return {compressed: false, data: jsonString};
	}

	try {
		const bytes = new TextEncoder().encode(jsonString);
		const compressed = gzipSync(bytes, {level: 6});
		const base64 = btoa(String.fromCharCode(...compressed));

		// Only use compression if it actually reduces size
		if (base64.length < jsonString.length * 0.9) {
			return {compressed: true, data: base64};
		}
	} catch (error) {
		console.warn('[Compression] Failed to compress data:', error);
	}

	return {compressed: false, data: jsonString};
}

/**
 * 🎈 Decompress data from storage
 */
export function decompressFromStorage(storedData: any): any {
	if (!storedData) return storedData;

	// Handle non-compressed data or already parsed data
	if (typeof storedData !== 'object' || !storedData.compressed) {
		return storedData;
	}

	try {
		const bytes = Uint8Array.from(atob(storedData.data), (c) => c.charCodeAt(0));
		const decompressed = gunzipSync(bytes);
		const jsonString = new TextDecoder().decode(decompressed);
		return JSON.parse(jsonString);
	} catch (error) {
		console.error('[Compression] Failed to decompress data:', error);
		// Try to parse as regular JSON if decompression fails
		if (typeof storedData.data === 'string') {
			try {
				return JSON.parse(storedData.data);
			} catch {
				// Return original data if all parsing fails
				return storedData;
			}
		}
		return storedData;
	}
}

/**
 * 📊 Calculate the compression ratio
 */
export function getCompressionRatio(original: string, compressed: string): number {
	if (original.length === 0) return 1;
	return compressed.length / original.length;
}

/**
 * 📏 Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 💾 Check if there's enough storage quota available
 */
export async function checkStorageQuota(
	requiredBytes: number,
): Promise<{hasSpace: boolean; available?: number; used?: number}> {
	if (!navigator.storage || !navigator.storage.estimate) {
		// Storage API not available, assume we have space
		return {hasSpace: true};
	}

	try {
		const estimate = await navigator.storage.estimate();
		const usage = estimate.usage || 0;
		const quota = estimate.quota || 0;
		const available = quota - usage;

		// Add 10% buffer for safety
		const requiredWithBuffer = requiredBytes * 1.1;

		return {
			hasSpace: available > requiredWithBuffer,
			available,
			used: usage,
		};
	} catch (error) {
		console.warn('[Storage] Failed to estimate storage quota:', error);
		// On error, assume we have space
		return {hasSpace: true};
	}
}
