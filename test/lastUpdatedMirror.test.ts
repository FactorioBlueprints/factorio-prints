import {describe, expect, test} from "vite-plus/test";
import {planBlueprintLastUpdatedMirror} from "../functions/src/lastUpdatedMirror";

describe("planBlueprintLastUpdatedMirror", () =>
{
	test("writes the summary date onto a blueprint stamped a few milliseconds apart", () =>
	{
		expect(planBlueprintLastUpdatedMirror(1727000000000, 1727000000120)).toBe(1727000000000);
	});

	test("writes the summary date onto a blueprint stamped seconds earlier", () =>
	{
		expect(planBlueprintLastUpdatedMirror(1727000002596, 1727000000000)).toBe(1727000002596);
	});

	test("does nothing when the dates already match", () =>
	{
		expect(planBlueprintLastUpdatedMirror(1727000000000, 1727000000000)).toBeNull();
	});

	test("never recreates a deleted blueprint", () =>
	{
		expect(planBlueprintLastUpdatedMirror(1727000000000, null)).toBeNull();
	});

	test("ignores a summary date that was deleted or is not a timestamp", () =>
	{
		expect([
			planBlueprintLastUpdatedMirror(null, 1727000000000),
			planBlueprintLastUpdatedMirror("2024-09-22", 1727000000000),
		]).toStrictEqual([null, null]);
	});
});
