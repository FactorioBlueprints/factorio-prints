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
// The Worker accepts an ID token minted for it by an allowed service account. --gcloud-token mints one with gcloud
// as the service account gcloud is signed in as, and --impersonate <account> as another account; either renews it
// during a long run. Otherwise INGEST_ID_TOKEN must hold one. --auth-export is a listing
// from scripts/exportAuthUsers.ts: with it, profiles are reconciled and a user without an account is marked
// deleted; without it, profiles are left alone. A request the Worker refuses stops the run, naming the request, and
// --skip-requests <n> resumes after the n requests that went through. --amend-audit also corrects a blueprint's
// created date and author in place where nothing else about it differs, without a new version.

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
				"gcloud-token":
				{
					type: "boolean",
					default: false,
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
				"amend-audit":
				{
					type: "boolean",
					default: false,
				},
			},
		},
	);
	const {dump, impersonate} = values;
	const mint = impersonate !== undefined || values["gcloud-token"];
	// A backup is named by the instant it was taken.
	const dumpTime = Date.parse(values["dump-time"] ?? basename(dump ?? "").split("_")[0]);
	if (!dump || Number.isNaN(dumpTime) || (!mint && !process.env.INGEST_ID_TOKEN))
	{
		throw new Error(
			"Usage: [INGEST_ID_TOKEN=<token>] node scripts/reconcileD1.ts --dump <instant>_data.json[.gz] [--gcloud-token | --impersonate <service account>] [--dump-time <ISO instant>] [--auth-export <file>] [--chunk-size 20] [--skip-requests <n>] [--amend-audit] [--repair]",
		);
	}

	let token = process.env.INGEST_ID_TOKEN ?? "";
	let mintedAt = 0;
	const currentToken = (): string =>
	{
		if (mint && Date.now() - mintedAt > TOKEN_LIFETIME_MS)
		{
			token = execFileSync(
				"gcloud",
				[
					"auth",
					"print-identity-token",
					`--audiences=${values.audience}`,
					...(impersonate ? [`--impersonate-service-account=${impersonate}`, "--include-email"] : []),
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
				amended: 0,
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
			amendAudit: values["amend-audit"],
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
