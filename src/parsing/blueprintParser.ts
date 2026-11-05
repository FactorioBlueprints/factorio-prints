import atob from "atob";
import {unzlibSync, zlibSync} from "fflate";
import {type BlueprintBook, type RawBlueprintData, validateRawBlueprintData} from "../schemas";
import {type CompressionSettings, DEFAULT_COMPRESSION_SETTINGS} from "./compressionSettings";
import {getErrorMessage} from "./errors";

export class BlueprintError extends Error
{
	public cause?: Error;

	constructor(
		message: string,
		options?:
		{
			cause?: Error;
		},
	)
	{
		super(message);
		this.name = "BlueprintError";
		if (options?.cause)
		{
			this.cause = options.cause;
		}
	}
}

export function deserializeBlueprint(
	blueprintData: string,
	context?:
	{
		blueprintId?: string;
	},
): RawBlueprintData
{
	if (!blueprintData.startsWith("0"))
	{
		throw new BlueprintError(
			`Unknown blueprint format: string does not start with '0'.\nStarts with:\n'${blueprintData.slice(0, 80)}'`,
		);
	}

	const base64String = blueprintData.slice(1);

	let bytes: Uint8Array;
	try
	{
		bytes = Uint8Array.from(atob(base64String), (c: string) => c.charCodeAt(0));
	}
	catch (error)
	{
		throw new BlueprintError(
			"Invalid base64 data",
			{
				cause: error as Error,
			},
		);
	}

	let decompressedBytes: Uint8Array;
	try
	{
		decompressedBytes = unzlibSync(bytes);
	}
	catch (error)
	{
		throw new BlueprintError(
			"Failed to decompress blueprint data",
			{
				cause: error as Error,
			},
		);
	}

	const decompressedStr = new TextDecoder().decode(decompressedBytes);

	let parsedData: unknown;
	try
	{
		parsedData = JSON.parse(decompressedStr.trim());
	}
	catch (error)
	{
		throw new BlueprintError(
			"Invalid JSON in blueprint data",
			{
				cause: error as Error,
			},
		);
	}

	const result = validateRawBlueprintData(parsedData, context);

	return result;
}

export function deserializeBlueprintNoThrow(
	data: string,
	context?:
	{
		blueprintId?: string;
	},
): RawBlueprintData | null
{
	try
	{
		return deserializeBlueprint(data, context);
	}
	catch
	{
		return null;
	}
}

export function serializeBlueprint(
	data: RawBlueprintData,
	settings: CompressionSettings = DEFAULT_COMPRESSION_SETTINGS,
): string
{
	const jsonStr = JSON.stringify(data).trim();
	const bytes = new TextEncoder().encode(jsonStr);

	const compressed = zlibSync(bytes, settings);

	return "0" + btoa(compressed.reduce((acc, byte) => acc + String.fromCharCode(byte), ""));
}

function parseVersion4(versionNumber: number | string | bigint): string
{
	const version = BigInt(versionNumber);
	const parts: number[] = [];
	for (let i = 0; i < 4; i++)
	{
		const part = Number((version >> BigInt(48 - i * 16)) & BigInt(0xffff));
		parts.push(part);
	}

	return parts.join(".");
}

export function parseVersion3(number: number | string | bigint): string
{
	try
	{
		const version = parseVersion4(number);
		return version.split(".").slice(0, 3).join(".");
	}
	catch (error)
	{
		return `Invalid version: ${getErrorMessage(error)}`;
	}
}
