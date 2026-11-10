import {describe, expect, it} from "vite-plus/test";
import {buildUploadBatches} from "../scripts/r2UploadCore";

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
