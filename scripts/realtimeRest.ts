import {execFileSync} from "node:child_process";
import {chunkUpdates, type RealtimeUpdates} from "./realtimeRepairCore.ts";

// The Realtime Database REST calls the repair runners share. Writes use the application default credentials
// already on the machine, through gcloud. Nothing is sent twice: a write that fails stops the run.

/** Applies a plan as multi-path updates of a limited number of blueprints or users each. */
export const writeUpdates = async (
	databaseUrl: string,
	updates: RealtimeUpdates,
	perWrite: number,
	skip = 0,
): Promise<number> =>
{
	const chunks = chunkUpdates(updates, perWrite);
	if (chunks.length === 0) return 0;
	const token = execFileSync(
		"gcloud",
		["auth", "application-default", "print-access-token"],
		{
			encoding: "utf8",
		},
	).trim();
	for (const [index, chunk] of chunks.entries())
	{
		if (index < skip) continue;
		// A multi-path update names each location relative to the one it is sent to.
		const body = Object.fromEntries(Object.entries(chunk).map(([path, value]) => [path.replace(/^\//, ""), value]));
		const response = await fetch(
			`${databaseUrl}/.json`,
			{
				method: "PATCH",
				headers:
				{
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: JSON.stringify(body),
			},
		);
		if (!response.ok)
		{
			throw new Error(
				`Write ${index + 1} of ${chunks.length} returned ${response.status}: ${await response.text()}. ` +
					`${index} writes went through; resume with --skip ${index}.`,
			);
		}
		console.log(`write ${index + 1} of ${chunks.length} done (${Object.keys(chunk).length} paths)`);
	}
	return chunks.length;
};

/** Reads one small value. */
export const readValue = async (databaseUrl: string, path: string): Promise<unknown> =>
{
	const response = await fetch(`${databaseUrl}${path}.json`);
	if (!response.ok)
	{
		throw new Error(`Reading ${path} returned ${response.status}: ${await response.text()}`);
	}
	return response.json();
};
