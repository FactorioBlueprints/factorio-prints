import {readFile} from "node:fs/promises";
import {parseArgs} from "node:util";
import type {AuthUser} from "../functions/src/ingestEvents.ts";
import {buildReconcileRequests, mergeReports, type RealtimeDump, type ReconcileReport} from "./reconcileCore.ts";

// Compares the blueprints Worker's D1 rows with a Realtime Database dump and prints the drift. Shadow mode, the
// default, only reports; --repair applies the dump's version of each drifting entity. The Worker accepts an ID
// token minted for it by an allowed service account, for example:
//   INGEST_ID_TOKEN=$(gcloud auth print-identity-token --impersonate-service-account=<account> \
//     --audiences=https://blueprints.factorioprints.com/ingest --include-email)
//   node scripts/reconcileD1.ts --dump <dump.json> --dump-time 2026-11-08T15:42:00Z [--auth-export <auth.json>]

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				dump:
				{
					type: "string",
				},
				"dump-time":
				{
					type: "string",
				},
				"auth-export":
				{
					type: "string",
				},
				url:
				{
					type: "string",
					default: "https://blueprints.factorioprints.com/reconcile",
				},
				"chunk-size":
				{
					type: "string",
					default: "200",
				},
				repair:
				{
					type: "boolean",
					default: false,
				},
			},
		},
	);
	const token = process.env.INGEST_ID_TOKEN;
	const dumpTime = Date.parse(values["dump-time"] ?? "");
	if (!values.dump || Number.isNaN(dumpTime) || !token)
	{
		throw new Error(
			"Usage: INGEST_ID_TOKEN=<token> node scripts/reconcileD1.ts --dump <file> --dump-time <ISO instant> [--auth-export <file>] [--repair]",
		);
	}

	const dump = JSON.parse(await readFile(values.dump, "utf8")) as RealtimeDump;
	const authUsers = values["auth-export"]
		? (
				JSON.parse(await readFile(values["auth-export"], "utf8")) as
				{
					users: AuthUser[];
				}
			).users
		: undefined;
	const requests = buildReconcileRequests(
		dump,
		{
			dumpTime,
			mode: values.repair ? "repair" : "shadow",
			chunkSize: Number(values["chunk-size"]),
			authUsers,
		},
	);

	const reports: ReconcileReport[] = [];
	for (const [index, request] of requests.entries())
	{
		const response = await fetch(
			values.url,
			{
				method: "POST",
				headers:
				{
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: JSON.stringify(request),
			},
		);
		if (!response.ok)
		{
			throw new Error(
				`Request ${index + 1} of ${requests.length} returned ${response.status}: ${await response.text()}`,
			);
		}
		reports.push((await response.json()) as ReconcileReport);
		console.error(`Reconciled request ${index + 1} of ${requests.length}`);
	}
	console.log(JSON.stringify(mergeReports(reports), null, 2));
};

await main();
