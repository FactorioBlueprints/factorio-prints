import {describe, it, expect} from 'vitest';
import {compressForStorage, decompressFromStorage} from './dataCompression';

describe('dataCompression', () => {
	describe('compressForStorage', () => {
		it('does not compress small data', () => {
			const smallData = {message: 'small'};
			const result = compressForStorage(smallData);

			expect(result.compressed).toBe(false);
			expect(result.data).toBe(JSON.stringify(smallData));
		});

		it('compresses large data without stack overflow', () => {
			// Create a large object that would trigger compression
			const largeObject: any = {};
			for (let i = 0; i < 5000; i++) {
				largeObject[`key${i}`] =
					`This is a reasonably long value string to ensure we hit the compression threshold ${i}`;
			}

			const result = compressForStorage(largeObject);

			expect(result).toBeDefined();
			expect(typeof result.data).toBe('string');

			if (result.compressed) {
				const originalSize = JSON.stringify(largeObject).length;
				expect(result.data.length).toBeLessThan(originalSize * 0.9);
			}
		});

		it('handles extremely large data that previously caused stack overflow', () => {
			// Create an extremely large object similar to what causes the issue in production
			const veryLargeObject: any = {
				queries: [],
				metadata: {},
			};

			// Simulate a large query cache with many entries
			for (let i = 0; i < 10000; i++) {
				veryLargeObject.queries.push({
					id: `query-${i}`,
					data: `Data content that is reasonably sized to simulate real query cache ${i}`,
					timestamp: Date.now(),
					status: 'success',
					response: {
						items: Array(10)
							.fill(null)
							.map((_, j) => ({
								id: `item-${i}-${j}`,
								name: `Item name ${i}-${j}`,
								description: `Description for item ${i}-${j}`,
							})),
					},
				});
			}

			const result = compressForStorage(veryLargeObject);

			expect(result).toBeDefined();
			expect(typeof result.data).toBe('string');
		});

		it('falls back to uncompressed when compression fails', () => {
			const data = {test: 'data'};

			const originalTextEncoder = global.TextEncoder;
			global.TextEncoder = class {
				encode() {
					throw new Error('Encoding failed');
				}
			} as any;

			const result = compressForStorage(data);

			global.TextEncoder = originalTextEncoder;

			expect(result.compressed).toBe(false);
			expect(result.data).toBe(JSON.stringify(data));
		});
	});

	describe('decompressFromStorage', () => {
		it('handles non-compressed data', () => {
			const data = {test: 'data'};
			const result = decompressFromStorage(data);
			expect(result).toEqual(data);
		});

		it('decompresses compressed data correctly', () => {
			const originalData = {
				message: 'This needs to be long enough to trigger compression',
				array: Array(100).fill('value'),
				nested: {
					deep: {
						value: 'test',
					},
				},
			};

			const compressed = compressForStorage(originalData);
			if (compressed.compressed) {
				const decompressed = decompressFromStorage(compressed);
				expect(decompressed).toEqual(originalData);
			}
		});

		it('handles large compressed data', () => {
			const largeData: any = {};
			for (let i = 0; i < 5000; i++) {
				largeData[`key${i}`] = `Value ${i} with some additional content to make it larger`;
			}

			const compressed = compressForStorage(largeData);
			const decompressed = decompressFromStorage(compressed);

			expect(decompressed).toEqual(largeData);
		});

		it('handles decompression errors gracefully', () => {
			const invalidCompressed = {
				compressed: true,
				data: 'invalid-base64-data!!!',
			};

			const result = decompressFromStorage(invalidCompressed);

			expect(result).toEqual(invalidCompressed);
		});
	});

	describe('round-trip compression and decompression', () => {
		it('preserves data integrity for various data types', () => {
			const testCases = [
				{name: 'object', data: {a: 1, b: 'test', c: true}},
				{name: 'array', data: [1, 2, 3, 'test', null]},
				{name: 'nested', data: {a: {b: {c: {d: 'deep'}}}}},
			];

			for (const testCase of testCases) {
				const compressed = compressForStorage(testCase.data);
				const decompressed = compressed.compressed
					? decompressFromStorage(compressed)
					: JSON.parse(compressed.data);
				expect(decompressed).toEqual(testCase.data);
			}
		});
	});
});
