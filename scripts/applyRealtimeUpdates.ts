import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import {parseArgs} from "node:util";
import {chunkUpdates, type RealtimeUpdates} from "./realtimeRepairCore.ts";

// Applies a multi-path update file written by planRealtimeRepairs.ts to the Realtime Database, a limited number of
// blueprints or users per write, with the application default credentials already on the machine. Without
// --execute it only prints how many writes it would make. A write that fails stops the run, naming how many went
// through; nothing is sent twice.

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				updates:
				{
					type: "string",
				},
				"database-url":
				{
					type: "string",
				},
				"per-write":
				{
					type: "string",
					default: "150",
				},
				skip:
				{
					type: "string",
					default: "0",
				},
				execute:
				{
					type: "boolean",
					default: false,
				},
			},
		},
	);
	if (!values.updates || !values["database-url"])
	{
		throw new Error(
			"Usage: node scripts/applyRealtimeUpdates.ts --updates <plan.json> --database-url https://<project>.firebaseio.com [--per-write 150] [--skip <writes done>] [--execute]",
		);
	}
	const chunks = chunkUpdates(
		JSON.parse(await readFile(values.updates, "utf8")) as RealtimeUpdates,
		Number(values["per-write"]),
	);
	console.log(
		`${chunks.length} writes, ${chunks.reduce((total, chunk) => total + Object.keys(chunk).length, 0)} paths`,
	);
	if (!values.execute)
	{
		return;
	}
	const token = execFileSync(
		"gcloud",
		["auth", "application-default", "print-access-token"],
		{
			encoding: "utf8",
		},
	).trim();
	for (const [index, chunk] of chunks.entries())
	{
		if (index < Number(values.skip)) continue;
		const response = await fetch(
			`${values["database-url"]}/.json`,
			{
				method: "PATCH",
				headers:
				{
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: JSON.stringify(chunk),
			},
		);
		if (!response.ok)
		{
			throw new Error(
				`Write ${index + 1} of ${chunks.length} returned ${response.status}: ${await response.text()}. ` +
					`${index} writes went through; resume with --skip ${index}.`,
			);
		}
		console.log(`write ${index + 1} of ${chunks.length} done`);
	}
};

await main();
