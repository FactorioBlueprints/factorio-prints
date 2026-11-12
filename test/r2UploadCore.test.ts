import {describe, expect, it} from "vite-plus/test";
import {buildUploadBatches, uploadBatches} from "../scripts/r2UploadCore";

const shaA = "a".repeat(64);
const shaB = "b".repeat(64);
const shaC = "c".repeat(64);

describe("buildUploadBatches", () =>
{
	it("pairs each string file with the R2 key the Worker reads, in stable sorted batches", () =>
	{
		expect(buildUploadBatches([shaC, shaA, shaB], "/strings", 2)).toStrictEqual([
			[
				{
					key: `strings/${shaA}`,
					file: `/strings/${shaA}`,
				},
				{
					key: `strings/${shaB}`,
					file: `/strings/${shaB}`,
				},
			],
			[
				{
					key: `strings/${shaC}`,
					file: `/strings/${shaC}`,
				},
			],
		]);
	});

	it("refuses a file that is not named by a SHA-256", () =>
	{
		expect(() => buildUploadBatches([shaA, ".DS_Store"], "/strings", 2)).toThrow(
			".DS_Store is not a SHA-256 file name",
		);
	});
});

describe("uploadBatches", () =>
{
	const batches = buildUploadBatches([shaA, shaB, shaC], "/strings", 1);

	it("skips the batches already finished and records each batch as it finishes", async () =>
	{
		const sent: string[] = [];
		const finished: [string, number][] = [];

		await uploadBatches(
			batches,
			new Set([`1:strings/${shaA}`]),
			async (batch) =>
			{
				sent.push(batch[0].key);
			},
			async (batchId, objects) =>
			{
				finished.push([batchId, objects]);
			},
		);

		expect(
			{
				sent,
				finished,
			},
		).toStrictEqual(
			{
				sent: [`strings/${shaB}`, `strings/${shaC}`],
				finished: [
					[`1:strings/${shaB}`, 2],
					[`1:strings/${shaC}`, 3],
				],
			},
		);
	});

	it("stops at the first batch that fails, naming it, without sending it again or going on to the next", async () =>
	{
		const sent: string[] = [];
		const finished: string[] = [];

		await expect(
			uploadBatches(
				batches,
				new Set(),
				async (batch) =>
				{
					sent.push(batch[0].key);
					if (batch[0].key === `strings/${shaB}`)
					{
						throw new Error("502: Bad Gateway");
					}
				},
				async (batchId) =>
				{
					finished.push(batchId);
				},
			),
		).rejects.toThrow(
			`Batch 1:strings/${shaB} (objects 2 to 2 of 3) failed to upload: 502: Bad Gateway. Run again to resume from this batch.`,
		);
		expect(
			{
				sent,
				finished,
			},
		).toStrictEqual(
			{
				sent: [`strings/${shaA}`, `strings/${shaB}`],
				finished: [`1:strings/${shaA}`],
			},
		);
	});
});
