import atob from 'atob';
import {unzlibSync, zlibSync} from 'fflate';

import {DEFAULT_COMPRESSION_SETTINGS} from './compressionSettings';
import {getErrorMessage}              from './errors';

export class BlueprintError extends Error
{
	constructor(message, options)
	{
		super(message);
		this.name = 'BlueprintError';
		if (options?.cause)
		{
			this.cause = options.cause;
		}
	}
}

export function deserializeBlueprint(blueprintData)
{
	try
	{
		if (!blueprintData.startsWith('0'))
		{
			throw new BlueprintError(
				`Unknown blueprint format: string does not start with '0'.\nStarts with:\n'${blueprintData.slice(0, 80)}'`,
			);
		}

		const base64String = blueprintData.slice(1);
		const bytes = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));

		const decompressedBytes = unzlibSync(bytes);
		const decompressedStr = new TextDecoder().decode(decompressedBytes);

		const result = JSON.parse(decompressedStr.trim());

		return result;
	}
	catch (error)
	{
		console.error('Error deserializing blueprint:', error);
		throw error;
	}
}

export function deserializeBlueprintNoThrow(data)
{
	try
	{
		return deserializeBlueprint(data);
	}
	catch (error)
	{
		console.error('Failed to parse blueprint:', error);
		return null;
	}
}

export function serializeBlueprint(data, settings = DEFAULT_COMPRESSION_SETTINGS)
{
	const jsonStr = JSON.stringify(data).trim();
	const bytes = new TextEncoder().encode(jsonStr);

	const compressed = zlibSync(bytes, settings);

	return '0' + btoa(compressed.reduce((data, byte) => data + String.fromCharCode(byte), ''));
}

export function extractBlueprint(blueprint, path)
{
	if (!path)
	{
		return blueprint;
	}

	try
	{
		const parts = path.split('.');
		let current = blueprint;
		let traversedPath = '';

		for (const part of parts)
		{
			const index = parseInt(part) - 1;
			traversedPath += (traversedPath ? '.' : '') + part;

			if (!current.blueprint_book?.blueprints)
			{
				throw new BlueprintError(`Invalid path ${path}: no blueprint book at ${traversedPath}`);
			}

			if (isNaN(index))
			{
				throw new BlueprintError(`Invalid path ${path}: "${part}" is not a valid number at ${traversedPath}`);
			}

			if (index < 0)
			{
				throw new BlueprintError(`Invalid path ${path}: index must be positive at ${traversedPath}`);
			}

			if (index >= current.blueprint_book.blueprints.length)
			{
				throw new BlueprintError(
					`Invalid path ${path}: index ${part} is out of bounds at ${traversedPath} `
					+ `(valid range: 1-${current.blueprint_book.blueprints.length})`,
				);
			}

			current = current.blueprint_book.blueprints[index];
		}

		return current;
	}
	catch (err)
	{
		if (err instanceof BlueprintError)
		{
			throw err;
		}
		if (err instanceof Error)
		{
			throw new BlueprintError(`Failed to extract blueprint: ${err.message}`, {cause: err});
		}
		throw new BlueprintError('Failed to extract blueprint: Unknown error');
	}
}

export function parseVersion4(versionNumber)
{
	const version = BigInt(versionNumber);
	const parts = [];
	for (let i = 0; i < 4; i++)
	{
		const part = Number((version >> BigInt(48 - i * 16)) & BigInt(0xffff));
		parts.push(part);
	}

	return parts.join('.');
}

export function parseVersion3(number)
{
	try
	{
		const version = parseVersion4(number);
		return version.split('.').slice(0, 3).join('.');
	}
	catch (error)
	{
		return `Invalid version: ${getErrorMessage(error)}`;
	}
}
