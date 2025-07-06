/**
 * Safely stringify objects that may be too large.
 * Returns an error message if the object is too large to stringify.
 */
export function safeJsonStringify(object: unknown, indent: number = 4): string
{
	try
	{
		return JSON.stringify(object, null, indent);
	}
	catch (error)
	{
		if (error instanceof RangeError)
		{
			return "Blueprint too large to display as JSON. Use the blueprint string view instead.";
		}
		return `Error: ${error instanceof Error ? error.message : 'Failed to display JSON'}`;
	}
}
