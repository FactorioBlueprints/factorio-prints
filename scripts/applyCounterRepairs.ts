import {readFile, writeFile} from "node:fs/promises";
import {parseArgs} from "node:util";
import {type CounterRepair, counterPaths, selectCounterWrites} from "./realtimeRepairCore.ts";
import {readValue, writeUpdates} from "./realtimeRest.ts";

// Applies the favorite-counter repairs planned by planRealtimeRepairs.ts (its details.json). A plan is made from
// a backup, so each counter's live value is read first, one small number per path, and a counter is written only
// where that value is still the one the plan saw; the rest are skipped and listed. Without --execute it reads and
// reports, and writes nothing.

const READS_AT_ONCE = 8;

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				details:
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
				"skipped-out":
				{
					type: "string",
				},
				execute:
				{
					type: "boolean",
					default: false,
				},
			},
		},
	);
	const databaseUrl = values["database-url"];
	if (!values.details || !databaseUrl)
	{
		throw new Error(
			"Usage: node scripts/applyCounterRepairs.ts --details <details.json> --database-url https://<project>.firebaseio.com [--skipped-out <file>] [--execute]",
		);
	}
	const {counters} = JSON.parse(await readFile(values.details, "utf8")) as
	{
		counters:
		{
			repaired: CounterRepair[];
		};
	};
	const paths = counters.repaired.flatMap((repair) => counterPaths(repair).map(([path]) => path));
	const live = new Map<string, unknown>();
	let next = 0;
	await Promise.all(
		Array.from(
			{
				length: READS_AT_ONCE,
			},
			async () =>
			{
				while (next < paths.length)
				{
					const path = paths[next++];
					live.set(path, await readValue(databaseUrl, path));
				}
			},
		),
	);

	const {updates, skipped} = selectCounterWrites(counters.repaired, live);
	if (values["skipped-out"])
	{
		await writeFile(values["skipped-out"], JSON.stringify(skipped, null, "\t"));
	}
	console.log(
		JSON.stringify(
			{
				counterPathsPlanned: paths.length,
				stillAsPlanned: Object.keys(updates).length,
				skipped: skipped.length,
				skippedSample: skipped.slice(0, 10),
			},
			null,
			"\t",
		),
	);
	if (values.execute)
	{
		const writes = await writeUpdates(databaseUrl, updates, Number(values["per-write"]));
		console.log(`${Object.keys(updates).length} counters written in ${writes} writes`);
	}
};

await main();
