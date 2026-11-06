import {describe, expect, test} from "vite-plus/test";
import {getIndexedCollectorUserIds} from "../functions/src/collectorIndex";

describe("collector index", () =>
{
	test("reads only active users from a blueprint collector index", () =>
	{
		expect(
			getIndexedCollectorUserIds(
				{
					alice: true,
					bob: false,
					charlie: true,
				},
			),
		).toStrictEqual(["alice", "charlie"]);
	});
});
