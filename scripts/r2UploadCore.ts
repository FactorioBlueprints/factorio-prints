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
