import {describe, expect, it} from 'vitest';
import {BlueprintError, deserializeBlueprint, deserializeBlueprintNoThrow} from './blueprintParser';

describe('blueprintParser', () => {
	describe('corrupted data handling', () => {
		it('should handle invalid base64 data gracefully', () => {
			const invalidBase64 = '0{}[]'; // Invalid base64 characters

			// Regular deserializer should throw
			expect(() => deserializeBlueprint(invalidBase64)).toThrow(BlueprintError);

			// NoThrow version should return null
			expect(deserializeBlueprintNoThrow(invalidBase64)).toBeNull();
		});

		it('should handle corrupted compressed data gracefully', () => {
			// Valid base64 but invalid zlib data
			const corruptedCompressed = '0SGVsbG8gV29ybGQ='; // "Hello World" in base64, not valid zlib

			// Regular deserializer should throw
			expect(() => deserializeBlueprint(corruptedCompressed)).toThrow(BlueprintError);
			expect(() => deserializeBlueprint(corruptedCompressed)).toThrow('Failed to decompress blueprint data');

			// NoThrow version should return null
			expect(deserializeBlueprintNoThrow(corruptedCompressed)).toBeNull();
		});

		it('should handle invalid JSON data gracefully', () => {
			// This is a valid zlib compressed string containing invalid JSON
			// Created with: zlibSync(new TextEncoder().encode('{invalid json'))
			const invalidJsonCompressed = '0eJyrzswrS8zJTFHIKs7PAwAlewU9';

			// Regular deserializer should throw
			expect(() => deserializeBlueprint(invalidJsonCompressed)).toThrow(BlueprintError);
			expect(() => deserializeBlueprint(invalidJsonCompressed)).toThrow('Invalid JSON in blueprint data');

			// NoThrow version should return null
			expect(deserializeBlueprintNoThrow(invalidJsonCompressed)).toBeNull();
		});

		it('should handle schema validation errors gracefully', () => {
			// Valid compressed JSON that doesn't match blueprint schema (null)
			const invalidSchemaCompressed = '0eJzLK83JAQAEXwG8';

			// Regular deserializer should throw with schema error
			expect(() => deserializeBlueprint(invalidSchemaCompressed)).toThrow('Invalid raw blueprint data');

			// NoThrow version should return null
			expect(deserializeBlueprintNoThrow(invalidSchemaCompressed)).toBeNull();
		});

		it('should handle blueprints that do not start with 0', () => {
			const invalidFormat = '1somedata';

			// All versions should handle this the same way
			expect(() => deserializeBlueprint(invalidFormat)).toThrow('Unknown blueprint format');
			expect(deserializeBlueprintNoThrow(invalidFormat)).toBeNull();
		});
	});
});
