import atob from 'atob';
import {unzlibSync, zlibSync} from 'fflate';

import {DEFAULT_COMPRESSION_SETTINGS, type CompressionSettings} from './compressionSettings';
import {getErrorMessage} from './errors';
import {type RawBlueprintData, type BlueprintBook, validateRawBlueprintData} from '../schemas';

export class BlueprintError extends Error {
	public cause?: Error;

	constructor(message: string, options?: {cause?: Error}) {
		super(message);
		this.name = 'BlueprintError';
		if (options?.cause) {
			this.cause = options.cause;
		}
	}
}

export function deserializeBlueprint(blueprintData: string): RawBlueprintData {
	if (!blueprintData.startsWith('0')) {
		throw new BlueprintError(
			`Unknown blueprint format: string does not start with '0'.\nStarts with:\n'${blueprintData.slice(0, 80)}'`,
		);
	}

	const base64String = blueprintData.slice(1);
	const bytes = Uint8Array.from(atob(base64String), (c: string) => c.charCodeAt(0));

	const decompressedBytes = unzlibSync(bytes);
	const decompressedStr = new TextDecoder().decode(decompressedBytes);

	const parsedData = JSON.parse(decompressedStr.trim());

	// Validate the parsed data using Zod schema
	const result = validateRawBlueprintData(parsedData);

	return result;
}

export function deserializeBlueprintNoThrow(data: string): RawBlueprintData | null {
	try {
		return deserializeBlueprint(data);
	} catch {
		return null;
	}
}

export function serializeBlueprint(
	data: RawBlueprintData,
	settings: CompressionSettings = DEFAULT_COMPRESSION_SETTINGS,
): string {
	const jsonStr = JSON.stringify(data).trim();
	const bytes = new TextEncoder().encode(jsonStr);

	const compressed = zlibSync(bytes, settings);

	return '0' + btoa(compressed.reduce((acc, byte) => acc + String.fromCharCode(byte), ''));
}

export function extractBlueprint(blueprint: RawBlueprintData, path?: string): RawBlueprintData {
	if (!path) {
		return blueprint;
	}

	try {
		const parts = path.split('.');
		let current: RawBlueprintData = blueprint;
		let traversedPath = '';

		for (const part of parts) {
			const index = parseInt(part) - 1;
			traversedPath += (traversedPath ? '.' : '') + part;

			if (!current.blueprint_book?.blueprints) {
				throw new BlueprintError(`Invalid path ${path}: no blueprint book at ${traversedPath}`);
			}

			if (isNaN(index)) {
				throw new BlueprintError(`Invalid path ${path}: "${part}" is not a valid number at ${traversedPath}`);
			}

			if (index < 0) {
				throw new BlueprintError(`Invalid path ${path}: index must be positive at ${traversedPath}`);
			}

			if (index >= current.blueprint_book.blueprints.length) {
				throw new BlueprintError(
					`Invalid path ${path}: index ${part} is out of bounds at ${traversedPath} ` +
						`(valid range: 1-${current.blueprint_book.blueprints.length})`,
				);
			}

			const blueprintEntry = current.blueprint_book.blueprints[index];
			if (blueprintEntry.blueprint) {
				current = {blueprint: blueprintEntry.blueprint};
			} else {
				throw new BlueprintError(`Invalid path ${path}: no blueprint at index ${part} at ${traversedPath}`);
			}
		}

		return current;
	} catch (err) {
		if (err instanceof BlueprintError) {
			throw err;
		}
		if (err instanceof Error) {
			throw new BlueprintError(`Failed to extract blueprint: ${err.message}`, {cause: err});
		}
		throw new BlueprintError('Failed to extract blueprint: Unknown error');
	}
}

export function parseVersion4(versionNumber: number | string | bigint): string {
	const version = BigInt(versionNumber);
	const parts: number[] = [];
	for (let i = 0; i < 4; i++) {
		const part = Number((version >> BigInt(48 - i * 16)) & BigInt(0xffff));
		parts.push(part);
	}

	return parts.join('.');
}

export function parseVersion3(number: number | string | bigint): string {
	try {
		const version = parseVersion4(number);
		return version.split('.').slice(0, 3).join('.');
	} catch (error) {
		return `Invalid version: ${getErrorMessage(error)}`;
	}
}
