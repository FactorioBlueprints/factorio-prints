import atob from "atob";
import {unzlibSync} from "fflate";

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
