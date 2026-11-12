import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {mkdir, readdir, readFile, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";
import {parseArgs} from "node:util";
import {buildUploadBatches, uploadBatches} from "./r2UploadCore.ts";

// Uploads the blueprint strings written by importHistory.ts to R2 with `wrangler r2 bulk put`, one batch at a time.
// uploaded.json in the state directory remembers the finished batches, so an interrupted run picks up where it
// stopped. Each file is checked against its name (the SHA-256 of its content) before it is sent. Batches are paced
// because object uploads count against the Cloudflare API's limit of 1,200 requests per five minutes. A batch that
// fails stops the run; nothing is retried.

const main = async (): Promise<void> =>
{
	const {values} = parseArgs(
		{
			options:
			{
				"strings-dir":
				{
					type: "string",
				},
				"state-dir":
				{
					type: "string",
				},
				bucket:
				{
					type: "string",
				},
				"batch-size":
				{
					type: "string",
					default: "500",
				},
				"batch-seconds":
				{
					type: "string",
					default: "150",
				},
			},
		},
	);
	const {bucket} = values;
	if (!values["strings-dir"] || !values["state-dir"] || !bucket)
	{
		throw new Error(
			"Usage: node scripts/uploadStrings.ts --strings-dir <dir> --state-dir <dir> --bucket <r2 bucket> [--batch-size 500] [--batch-seconds 150]",
		);
	}
	const stringsDirectory = resolve(values["strings-dir"]);
	const stateDirectory = resolve(values["state-dir"]);
	await mkdir(
		stateDirectory,
		{
			recursive: true,
		},
	);

	const batches = buildUploadBatches(await readdir(stringsDirectory), stringsDirectory, Number(values["batch-size"]));
	const statePath = join(stateDirectory, "uploaded.json");
	const uploaded = new Set<string>(
		existsSync(statePath) ? (JSON.parse(await readFile(statePath, "utf8")) as string[]) : [],
	);
	const total = batches.reduce((count, batch) => count + batch.length, 0);
	const manifestPath = join(stateDirectory, "manifest.json");
	let started = Date.now();
	await uploadBatches(
		batches,
		uploaded,
		async (batch) =>
		{
			started = Date.now();
			for (const entry of batch)
			{
				const sha256 = createHash("sha256")
					.update(await readFile(entry.file))
					.digest("hex");
				if (sha256 !== basename(entry.file))
				{
					throw new Error(`${entry.file} holds content whose SHA-256 is ${sha256}`);
				}
			}
			await writeFile(manifestPath, JSON.stringify(batch));
			execFileSync(
				"pnpm",
				[
					"exec",
					"wrangler",
					"r2",
					"bulk",
					"put",
					bucket,
					"--remote",
					"--force",
					"--filename",
					manifestPath,
					"--content-type",
					"text/plain; charset=utf-8",
				],
				{
					stdio: ["ignore", "ignore", "inherit"],
				},
			);
		},
		async (batchId, objects) =>
		{
			uploaded.add(batchId);
			await writeFile(statePath, JSON.stringify([...uploaded], null, "\t"));
			console.log(`${objects} of ${total} objects uploaded`);
			if (objects < total)
			{
				await sleep(Math.max(0, Number(values["batch-seconds"]) * 1000 - (Date.now() - started)));
			}
		},
	);
	console.log(`All ${total} objects are in ${bucket}`);
};

await main();
