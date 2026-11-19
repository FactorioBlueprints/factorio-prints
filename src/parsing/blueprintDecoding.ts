import atob from "atob";
import {Unzlib, unzlibSync} from "fflate";

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

/**
 * Decodes a Factorio blueprint string ("0" + base64 of zlib-deflated JSON) into its parsed JSON, without validating its shape.
 * Free of DOM and app dependencies so a Cloudflare Worker can use it.
 */
export function decodeBlueprintJson(blueprintData: string): unknown
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
		decompressedBytes = inflate(bytes);
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

	try
	{
		return JSON.parse(decompressedStr.trim());
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
}

// Some stored strings end before the deflate stream does, though the JSON inside is complete. They still decode,
// so fall back to the bytes inflated before the input ran out.
function inflate(bytes: Uint8Array): Uint8Array
{
	try
	{
		return unzlibSync(bytes);
	}
	catch (error)
	{
		const partial = inflatePartially(bytes);
		if (partial.length === 0) throw error;
		return partial;
	}
}

function inflatePartially(bytes: Uint8Array): Uint8Array
{
	const chunks: Uint8Array[] = [];
	try
	{
		new Unzlib((chunk) => chunks.push(chunk)).push(bytes, false);
	}
	catch
	{
		return new Uint8Array();
	}
	const result = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
	let offset = 0;
	for (const chunk of chunks)
	{
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}
