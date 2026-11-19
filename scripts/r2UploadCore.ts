/**
 * Pure helpers for uploading the blueprint strings written by importHistory.ts to R2.
 * The runner in uploadStrings.ts does the file and wrangler IO.
 */

import {blueprintStringObjectKey} from "../workers/blueprints/src/stringLayout.ts";

export interface UploadEntry
{
	key: string;
	file: string;
}

/**
 * Splits the string files (each named by its SHA-256) into batches in sorted order, so the same directory always
 * gives the same batches and a finished batch can be skipped on the next run.
 */
export const buildUploadBatches = (fileNames: string[], directory: string, batchSize: number): UploadEntry[][] =>
{
	const entries = [...fileNames].sort().map((sha): UploadEntry =>
	{
		if (!/^[0-9a-f]{64}$/.test(sha))
		{
			throw new Error(`${sha} is not a SHA-256 file name`);
		}
		return {
			key: blueprintStringObjectKey(sha),
			file: `${directory}/${sha}`,
		};
	});
	const batches: UploadEntry[][] = [];
	for (let start = 0; start < entries.length; start += batchSize)
	{
		batches.push(entries.slice(start, start + batchSize));
	}
	return batches;
};

/**
 * Sends each batch that is not already finished, in order, and reports each one as it finishes. A batch is
 * identified by the batch size and its first key, which are stable for a given directory. The first failure stops
 * the run with an error naming the batch: nothing is sent a second time, and the next run resumes from that batch.
 */
export const uploadBatches = async (
	batches: UploadEntry[][],
	finishedBatchIds: ReadonlySet<string>,
	upload: (batch: UploadEntry[]) => Promise<void>,
	finished: (batchId: string, objectsSoFar: number) => Promise<void>,
): Promise<void> =>
{
	const batchSize = batches[0]?.length ?? 0;
	const total = batches.reduce((count, batch) => count + batch.length, 0);
	let objects = 0;
	for (const batch of batches)
	{
		const batchId = `${batchSize}:${batch[0].key}`;
		const first = objects + 1;
		objects += batch.length;
		if (finishedBatchIds.has(batchId))
		{
			continue;
		}
		try
		{
			await upload(batch);
		}
		catch (error)
		{
			const reason = error instanceof Error ? error.message : String(error);
			throw new Error(
				`Batch ${batchId} (objects ${first} to ${objects} of ${total}) failed to upload: ${reason}. ` +
					"Run again to resume from this batch.",
				{
					cause: error,
				},
			);
		}
		await finished(batchId, objects);
	}
};
