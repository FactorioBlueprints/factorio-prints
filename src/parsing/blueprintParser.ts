import {zlibSync} from "fflate";
import {type BlueprintBook, type RawBlueprintData, validateRawBlueprintData} from "../schemas";
import {type CompressionSettings, DEFAULT_COMPRESSION_SETTINGS} from "./compressionSettings";
import {BlueprintError, decodeBlueprintJson} from "./blueprintDecoding";
import {getErrorMessage} from "./errors";

export {BlueprintError};

export function deserializeBlueprint(
	blueprintData: string,
	context?:
	{
		blueprintId?: string;
	},
): RawBlueprintData
{
	const parsedData = decodeBlueprintJson(blueprintData);
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
