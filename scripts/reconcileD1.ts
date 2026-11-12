import {execFileSync} from "node:child_process";
import {createReadStream} from "node:fs";
import {readFile} from "node:fs/promises";
import {basename} from "node:path";
import {parseArgs} from "node:util";
import {createGunzip} from "node:zlib";
import {type AuthExport, toAccountRecord} from "./authExportCore.ts";
import {reconcileDump} from "./dumpReconcileCore.ts";
import type {ReconcileRequestBody, ReconcileResponse} from "./reconcileCore.ts";

// Merges a Realtime Database backup (<instant>_<project>_data.json.gz) into the blueprints Worker's store through
// its /reconcile route, reading the backup as a stream and posting the events in small batches. Shadow mode, the
// default, only reports the drift; --repair applies it. It is safe to run while live ingest is writing: the Worker
// overwrites a row only when its stored time is older than the event's (see scripts/dumpReconcileCore.ts).
//
// The Worker accepts an ID token minted for it by an allowed service account. --impersonate <account> mints one
// with gcloud and renews it during a long run; otherwise INGEST_ID_TOKEN must hold one. --auth-export is a listing
// from scripts/exportAuthUsers.ts: with it, profiles are reconciled and a user without an account is marked
// deleted; without it, profiles are left alone. A request the Worker refuses stops the run, naming the request, and
// --skip-requests <n> resumes after the n requests that went through.

const TOKEN_LIFETIME_MS = 45 * 60_000;

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
				audience:
				{
					type: "string",
					default: "https://blueprints.factorioprints.com/ingest",
				},
				impersonate:
				{
					type: "string",
				},
				"chunk-size":
				{
					type: "string",
					default: "20",
				},
				"skip-requests":
				{
					type: "string",
					default: "0",
				},
				repair:
				{
					type: "boolean",
					default: false,
				},
			},
		},
	);
	const {dump, impersonate} = values;
	// A backup is named by the instant it was taken.
	const dumpTime = Date.parse(values["dump-time"] ?? basename(dump ?? "").split("_")[0]);
	if (!dump || Number.isNaN(dumpTime) || (!impersonate && !process.env.INGEST_ID_TOKEN))
	{
		throw new Error(
			"Usage: [INGEST_ID_TOKEN=<token>] node scripts/reconcileD1.ts --dump <instant>_data.json[.gz] [--impersonate <service account>] [--dump-time <ISO instant>] [--auth-export <file>] [--chunk-size 20] [--skip-requests <n>] [--repair]",
		);
	}

	let token = process.env.INGEST_ID_TOKEN ?? "";
	let mintedAt = 0;
	const currentToken = (): string =>
	{
		if (impersonate && Date.now() - mintedAt > TOKEN_LIFETIME_MS)
		{
			token = execFileSync(
				"gcloud",
				[
					"auth",
					"print-identity-token",
					`--impersonate-service-account=${impersonate}`,
					`--audiences=${values.audience}`,
					"--include-email",
				],
				{
					encoding: "utf8",
					stdio: ["ignore", "pipe", "ignore"],
				},
			).trim();
			mintedAt = Date.now();
		}
		return token;
	};

	const accounts = values["auth-export"]
		? new Map(
				(JSON.parse(await readFile(values["auth-export"], "utf8")) as AuthExport).users.map((user) => [
					user.uid,
					toAccountRecord(user),
				]),
			)
		: undefined;
	const skip = Number(values["skip-requests"]);
	let requests = 0;
	const send = async (request: ReconcileRequestBody): Promise<ReconcileResponse> =>
	{
		requests++;
		if (requests <= skip)
		{
			return {
				drift: [],
				stale: 0,
				ignored: 0,
			};
		}
		const response = await fetch(
			values.url,
			{
				method: "POST",
				headers:
				{
					authorization: `Bearer ${currentToken()}`,
					"content-type": "application/json",
				},
				body: JSON.stringify(request),
			},
		);
		if (!response.ok)
		{
			throw new Error(
				`Request ${requests} returned ${response.status}: ${await response.text()}. ` +
					`${requests - 1} requests went through; resume with --skip-requests ${requests - 1}.`,
			);
		}
		if (requests % 100 === 0)
		{
			console.error(`${requests} requests sent`);
		}
		return (await response.json()) as ReconcileResponse;
	};

	const report = await reconcileDump(
		{
			readDump: () =>
			{
				const file = createReadStream(dump);
				const text = dump.endsWith(".gz") ? file.pipe(createGunzip()) : file;
				text.setEncoding("utf8");
				return text as AsyncIterable<string>;
			},
			dumpTime,
			blueprintTime: "lastUpdatedDate",
			mode: values.repair ? "repair" : "shadow",
			chunkSize: Number(values["chunk-size"]),
			send,
			accountOf: accounts && ((userId) => accounts.get(userId) ?? null),
		},
	);
	console.log(
		JSON.stringify(
			{
				requests,
				...report,
			},
			null,
			"\t",
		),
	);
};

await main();
