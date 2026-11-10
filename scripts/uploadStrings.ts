import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync} from "node:fs";
import {mkdir, readdir, readFile, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";
import {parseArgs} from "node:util";
import {buildUploadBatches} from "./r2UploadCore.ts";

// Uploads the blueprint strings written by importHistory.ts to R2 with `wrangler r2 bulk put`, one batch at a time.
// uploaded.json in the state directory remembers the finished batches, so an interrupted run picks up where it
// stopped. Each file is checked against its name (the SHA-256 of its content) before it is sent. Batches are paced
// because object uploads count against the Cloudflare API's limit of 1,200 requests per five minutes.

const UPLOAD_ATTEMPTS = 5;
const RETRY_SECONDS = 60;

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
	let objects = 0;
	for (const batch of batches)
	{
		// A batch is identified by its first key, which is stable for a given directory and batch size.
		const batchId = `${values["batch-size"]}:${batch[0].key}`;
		objects += batch.length;
		if (uploaded.has(batchId))
		{
			continue;
		}
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
		const manifestPath = join(stateDirectory, "manifest.json");
		await writeFile(manifestPath, JSON.stringify(batch));
		const started = Date.now();
		// The API now and then answers one upload with a 502, which fails the whole batch. Sending a batch again is
		// harmless, since every object is stored under the digest of its content.
		for (let attempt = 1; ; attempt++)
		{
			try
			{
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
				break;
			}
			catch (error)
			{
				if (attempt === UPLOAD_ATTEMPTS)
				{
					throw error;
				}
				console.error(`Batch ${batchId} failed on attempt ${attempt}; trying again`);
				await sleep(RETRY_SECONDS * 1000);
			}
		}
		uploaded.add(batchId);
		await writeFile(statePath, JSON.stringify([...uploaded], null, "\t"));
		console.log(`${objects} of ${batches.flat().length} objects uploaded`);
		await sleep(Math.max(0, Number(values["batch-seconds"]) * 1000 - (Date.now() - started)));
	}
	console.log(`All ${objects} objects are in ${bucket}`);
};

await main();
