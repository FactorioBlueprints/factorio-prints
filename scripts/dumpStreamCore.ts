/**
 * Streaming reader for a Realtime Database backup, which is one JSON document too large to parse in one piece.
 * The runners do the file IO and feed it the text in chunks.
 */

const QUOTE = '"';
const BACKSLASH = "\\";

/**
 * Picks out the children of chosen top-level nodes: with ["blueprints"], every `/blueprints/<key>` as
 * [node, key, JSON text of the value]. It tracks only nesting and the keys of the first two levels, so memory is
 * bounded by the largest child, and a chunk may end anywhere.
 */
export class DumpChildScanner
{
	private readonly wanted: ReadonlySet<string>;
	// Whether the container at each depth is an object; index 0 is the document root.
	private readonly objects: boolean[] = [];
	private inString = false;
	private escaped = false;
	private expectKey = false;
	private readingKey = false;
	private keyText = "";
	private node: string | null = null;
	private key: string | null = null;
	private capturing = false;
	private captured: string[] = [];
	private nextBackslash = -1;

	constructor(nodes: readonly string[])
	{
		this.wanted = new Set(nodes);
	}

	push(chunk: string): [node: string, key: string, json: string][]
	{
		const found: [string, string, string][] = [];
		this.nextBackslash = -1;
		let captureStart = 0;
		let index = 0;
		while (index < chunk.length)
		{
			if (this.inString)
			{
				index = this.readString(chunk, index);
				continue;
			}
			const character = chunk[index];
			const depth = this.objects.length;
			if (this.capturing && depth === 2 && (character === "," || character === "}"))
			{
				this.captured.push(chunk.slice(captureStart, index));
				found.push([this.node!, this.key!, this.captured.join("").trim()]);
				this.capturing = false;
				this.captured = [];
			}

			if (character === QUOTE)
			{
				this.inString = true;
				this.readingKey = this.expectKey && depth <= 2;
				this.keyText = "";
				this.expectKey = false;
			}
			else if (character === "{" || character === "[")
			{
				this.objects.push(character === "{");
				this.expectKey = character === "{";
			}
			else if (character === "}" || character === "]")
			{
				this.objects.pop();
				this.expectKey = false;
			}
			else if (character === ",")
			{
				this.expectKey = this.objects.at(-1) === true;
			}
			else if (
				character === ":" &&
				depth === 2 &&
				this.objects[1] &&
				this.node !== null &&
				this.wanted.has(this.node)
			)
			{
				this.capturing = true;
				captureStart = index + 1;
			}
			index++;
		}
		if (this.capturing)
		{
			this.captured.push(chunk.slice(captureStart));
		}
		return found;
	}

	/** Consumes string content from `index`, and returns the index after what it consumed. */
	private readString(chunk: string, index: number): number
	{
		if (this.escaped)
		{
			this.escaped = false;
			this.keyText += this.readingKey ? chunk[index] : "";
			return index + 1;
		}
		// Jump to the next quote or backslash; a multi-megabyte blueprint string has neither. The backslash
		// position is remembered, because most chunks have none and searching for one from every string is slow.
		if (this.nextBackslash < index)
		{
			const backslash = chunk.indexOf(BACKSLASH, index);
			this.nextBackslash = backslash === -1 ? chunk.length : backslash;
		}
		const quote = chunk.indexOf(QUOTE, index);
		const end = Math.min(quote === -1 ? chunk.length : quote, this.nextBackslash);
		if (this.readingKey)
		{
			this.keyText += chunk.slice(index, end);
		}
		if (end === chunk.length)
		{
			return end;
		}
		if (chunk[end] === BACKSLASH)
		{
			this.escaped = true;
			this.keyText += this.readingKey ? BACKSLASH : "";
			return end + 1;
		}
		this.inString = false;
		if (this.readingKey)
		{
			const name = JSON.parse(`${QUOTE}${this.keyText}${QUOTE}`) as string;
			if (this.objects.length === 1)
			{
				this.node = name;
			}
			else
			{
				this.key = name;
			}
		}
		return end + 1;
	}
}
