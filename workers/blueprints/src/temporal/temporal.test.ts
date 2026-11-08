import {beforeEach, describe, expect, it} from "vite-plus/test";
import type {DrizzleD1Database} from "drizzle-orm/d1";
import {emptyDatabase} from "../../test/database.ts";
import {content, item, itemPart, itemVersion} from "../../test/schema.ts";
import {SYSTEM_TO_SENTINEL} from "./columns.ts";
import
{
	bumpVersion,
	commit,
	contentAddressedTable,
	createUnitOfWork,
	findAsOf,
	findCurrent,
	history,
	insertIfAbsent,
	mergeList,
	phaseOut,
	temporalTable,
	upsert,
} from "./temporal.ts";

const items = temporalTable(item, ["key"]);
const parts = temporalTable(itemPart, ["itemKey", "position"]);
const versions = temporalTable(itemVersion, ["key"]);
const contents = contentAddressedTable(content, ["sha"]);

const t1 = Date.UTC(2026, 10, 8, 12, 0, 0, 0);
const t2 = Date.UTC(2026, 10, 8, 12, 0, 1, 500);
const t3 = Date.UTC(2026, 10, 8, 12, 0, 3, 250);

const text = (instant: number) => new Date(instant).toISOString().replace("T", " ").replace("Z", "");
const sentinelText = "9999-12-31 23:59:59.999";

const itemRow = (title: string, description: string | null, from: number, to = SYSTEM_TO_SENTINEL) => (
{
	key: "a",
	title,
	description,
	systemFrom: from,
	systemTo: to,
	systemFromText: text(from),
	systemToText: to === SYSTEM_TO_SENTINEL ? sentinelText : text(to),
});

const partRow = (itemKey: string, position: number, count: number, from: number, to = SYSTEM_TO_SENTINEL) => (
{
	itemKey,
	position,
	count,
	systemFrom: from,
	systemTo: to,
	systemFromText: text(from),
	systemToText: to === SYSTEM_TO_SENTINEL ? sentinelText : text(to),
});

let db: DrizzleD1Database;

beforeEach(async () =>
{
	db = await emptyDatabase();
});

const saveItem = async (now: number, title: string, description: string | null = null) =>
{
	const unitOfWork = createUnitOfWork(db, now);
	const change = await upsert(
		unitOfWork,
		items,
		{
			key: "a",
			title,
			description,
		},
	);
	const result = await commit(unitOfWork);
	return {
		change,
		result,
	};
};

describe("as-of reads", () =>
{
	beforeEach(async () =>
	{
		await saveItem(t1, "first");
		await saveItem(t2, "second");
	});

	it("returns the new row exactly at the version boundary", async () =>
	{
		expect(
			await findAsOf(
				db,
				items,
				{
					key: "a",
				},
				t2,
			),
		).toEqual(itemRow("second", null, t2));
	});

	it("returns the old row one millisecond before the boundary", async () =>
	{
		expect(
			await findAsOf(
				db,
				items,
				{
					key: "a",
				},
				t2 - 1,
			),
		).toEqual(itemRow("first", null, t1, t2));
	});

	it("returns nothing before the first version", async () =>
	{
		expect(
			await findAsOf(
				db,
				items,
				{
					key: "a",
				},
				t1 - 1,
			),
		).toBeUndefined();
	});

	it("returns the current row just before the sentinel and nothing at it", async () =>
	{
		expect(
			await findAsOf(
				db,
				items,
				{
					key: "a",
				},
				SYSTEM_TO_SENTINEL - 1,
			),
		).toEqual(itemRow("second", null, t2));
		expect(
			await findAsOf(
				db,
				items,
				{
					key: "a",
				},
				SYSTEM_TO_SENTINEL,
			),
		).toBeUndefined();
	});

	it("finds the current row and the contiguous history", async () =>
	{
		expect(
			await findCurrent(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual(itemRow("second", null, t2));
		expect(
			await history(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual([itemRow("first", null, t1, t2), itemRow("second", null, t2)]);
	});
});

describe("upsert", () =>
{
	it("inserts, updates, and leaves an identical row alone without creating history", async () =>
	{
		expect((await saveItem(t1, "first")).change).toEqual(
			{
				table: "item",
				key:
				{
					key: "a",
				},
				outcome: "inserted",
			},
		);
		expect((await saveItem(t2, "second")).change).toEqual(
			{
				table: "item",
				key:
				{
					key: "a",
				},
				outcome: "updated",
			},
		);
		expect(await saveItem(t3, "second")).toEqual(
			{
				change:
				{
					table: "item",
					key:
					{
						key: "a",
					},
					outcome: "unchanged",
				},
				result:
				{
					status: "committed",
					changes: [
						{
							table: "item",
							key:
							{
								key: "a",
							},
							outcome: "unchanged",
						},
					],
				},
			},
		);

		expect(
			await history(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual([itemRow("first", null, t1, t2), itemRow("second", null, t2)]);
	});

	it("treats a changed null column as a change", async () =>
	{
		await saveItem(t1, "first", "described");
		await saveItem(t2, "first");

		expect(
			await history(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual([itemRow("first", "described", t1, t2), itemRow("first", null, t2)]);
	});

	it("stamps one timestamp on every table in a unit of work", async () =>
	{
		const first = createUnitOfWork(db, t1);
		await upsert(
			first,
			items,
			{
				key: "a",
				title: "first",
				description: null,
			},
		);
		await upsert(
			first,
			parts,
			{
				itemKey: "a",
				position: 1,
				count: 10,
			},
		);
		await commit(first);

		const second = createUnitOfWork(db, t2);
		await upsert(
			second,
			items,
			{
				key: "a",
				title: "second",
				description: null,
			},
		);
		await upsert(
			second,
			parts,
			{
				itemKey: "a",
				position: 1,
				count: 11,
			},
		);
		await commit(second);

		expect(
			await history(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual([itemRow("first", null, t1, t2), itemRow("second", null, t2)]);
		expect(
			await history(
				db,
				parts,
				{
					itemKey: "a",
					position: 1,
				},
			),
		).toEqual([partRow("a", 1, 10, t1, t2), partRow("a", 1, 11, t2)]);
	});

	it("refuses to write one row twice in a unit of work", async () =>
	{
		const unitOfWork = createUnitOfWork(db, t1);
		await upsert(
			unitOfWork,
			items,
			{
				key: "a",
				title: "first",
				description: null,
			},
		);

		await expect(
			upsert(
				unitOfWork,
				items,
				{
					key: "a",
					title: "again",
					description: null,
				},
			),
		).rejects.toThrow('item {"key":"a"} is already written in this unit of work');
	});
});

describe("phaseOut", () =>
{
	it("closes the current row without deleting history", async () =>
	{
		await saveItem(t1, "first");

		const unitOfWork = createUnitOfWork(db, t2);
		expect(
			await phaseOut(
				unitOfWork,
				items,
				{
					key: "a",
				},
			),
		).toEqual(
			{
				table: "item",
				key:
				{
					key: "a",
				},
				outcome: "phased-out",
			},
		);
		await commit(unitOfWork);

		expect(
			await findCurrent(
				db,
				items,
				{
					key: "a",
				},
			),
		).toBeUndefined();
		expect(
			await history(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual([itemRow("first", null, t1, t2)]);
	});

	it("reports a missing row as unchanged", async () =>
	{
		const unitOfWork = createUnitOfWork(db, t1);

		expect(
			await phaseOut(
				unitOfWork,
				items,
				{
					key: "a",
				},
			),
		).toEqual(
			{
				table: "item",
				key:
				{
					key: "a",
				},
				outcome: "unchanged",
			},
		);
	});
});

describe("mergeList", () =>
{
	const mergeParts = async (now: number, itemKey: string, counts: Record<number, number>) =>
	{
		const unitOfWork = createUnitOfWork(db, now);
		const rows = Object.entries(counts).map(([position, count]) => (
		{
			itemKey,
			position: Number(position),
			count,
		}));
		const changes = await mergeList(
			unitOfWork,
			parts,
			{
				itemKey,
			},
			rows,
		);
		await commit(unitOfWork);
		return changes;
	};

	const currentParts = async (itemKey: string) =>
		(
			await history(
				db,
				parts,
				{
					itemKey,
				},
			)
		).filter((row) => row.systemTo === SYSTEM_TO_SENTINEL);

	it("updates changed rows, inserts new ones, and phases out missing ones", async () =>
	{
		await mergeParts(
			t1,
			"a",
			{
				1: 10,
				2: 20,
				3: 30,
			},
		);
		await mergeParts(
			t1,
			"b",
			{
				1: 99,
			},
		);

		expect(
			await mergeParts(
				t2,
				"a",
				{
					1: 10,
					2: 25,
					4: 40,
				},
			),
		).toEqual([
			{
				table: "item_part",
				key:
				{
					itemKey: "a",
					position: 1,
				},
				outcome: "unchanged",
			},
			{
				table: "item_part",
				key:
				{
					itemKey: "a",
					position: 2,
				},
				outcome: "updated",
			},
			{
				table: "item_part",
				key:
				{
					itemKey: "a",
					position: 4,
				},
				outcome: "inserted",
			},
			{
				table: "item_part",
				key:
				{
					itemKey: "a",
					position: 3,
				},
				outcome: "phased-out",
			},
		]);

		expect(
			await history(
				db,
				parts,
				{
					itemKey: "a",
				},
			),
		).toEqual([
			partRow("a", 1, 10, t1),
			partRow("a", 2, 20, t1, t2),
			partRow("a", 2, 25, t2),
			partRow("a", 3, 30, t1, t2),
			partRow("a", 4, 40, t2),
		]);
		expect(
			await history(
				db,
				parts,
				{
					itemKey: "b",
				},
			),
		).toEqual([partRow("b", 1, 99, t1)]);
	});

	it("phases out everything in scope when the source list is empty", async () =>
	{
		await mergeParts(
			t1,
			"a",
			{
				1: 10,
				2: 20,
			},
		);
		await mergeParts(
			t1,
			"b",
			{
				1: 99,
			},
		);

		expect(await mergeParts(t2, "a", {})).toEqual([
			{
				table: "item_part",
				key:
				{
					itemKey: "a",
					position: 1,
				},
				outcome: "phased-out",
			},
			{
				table: "item_part",
				key:
				{
					itemKey: "a",
					position: 2,
				},
				outcome: "phased-out",
			},
		]);

		expect(await currentParts("a")).toEqual([]);
		expect(await currentParts("b")).toEqual([partRow("b", 1, 99, t1)]);
	});

	it("skips the whole list when any row in scope changed after the event", async () =>
	{
		await mergeParts(
			t1,
			"a",
			{
				1: 10,
			},
		);
		await mergeParts(
			t3,
			"a",
			{
				1: 10,
				2: 20,
			},
		);

		const unitOfWork = createUnitOfWork(db, t3 + 1);
		expect(
			await mergeList(
				unitOfWork,
				parts,
				{
					itemKey: "a",
				},
				[
					{
						itemKey: "a",
						position: 1,
						count: 11,
					},
				],
				{
					eventTime: t2,
				},
			),
		).toEqual([
			{
				table: "item_part",
				key:
				{
					itemKey: "a",
					position: 1,
				},
				outcome: "skipped-stale",
			},
		]);
		await commit(unitOfWork);

		expect(await currentParts("a")).toEqual([partRow("a", 1, 10, t1), partRow("a", 2, 20, t3)]);
	});

	it("rejects a row outside the scope", async () =>
	{
		const unitOfWork = createUnitOfWork(db, t1);

		await expect(
			mergeList(
				unitOfWork,
				parts,
				{
					itemKey: "a",
				},
				[
					{
						itemKey: "b",
						position: 1,
						count: 1,
					},
				],
			),
		).rejects.toThrow('item_part {"itemKey":"b","position":1} is outside the merge scope {"itemKey":"a"}');
	});
});

describe("stale events", () =>
{
	it("skips an event older than the current row", async () =>
	{
		await saveItem(t2, "newer");

		const unitOfWork = createUnitOfWork(db, t3);
		expect(
			await upsert(
				unitOfWork,
				items,
				{
					key: "a",
					title: "older",
					description: null,
				},
				{
					eventTime: t1,
				},
			),
		).toEqual(
			{
				table: "item",
				key:
				{
					key: "a",
				},
				outcome: "skipped-stale",
			},
		);
		await commit(unitOfWork);

		expect(
			await history(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual([itemRow("newer", null, t2)]);
	});

	it("applies an event at or after the current row", async () =>
	{
		await saveItem(t1, "older");

		const unitOfWork = createUnitOfWork(db, t3);
		expect(
			await upsert(
				unitOfWork,
				items,
				{
					key: "a",
					title: "newer",
					description: null,
				},
				{
					eventTime: t1,
				},
			),
		).toEqual(
			{
				table: "item",
				key:
				{
					key: "a",
				},
				outcome: "updated",
			},
		);
	});

	it("does not resurrect a row phased out after the event", async () =>
	{
		await saveItem(t1, "first");
		const deletion = createUnitOfWork(db, t3);
		await phaseOut(
			deletion,
			items,
			{
				key: "a",
			},
		);
		await commit(deletion);

		const unitOfWork = createUnitOfWork(db, t3 + 1);
		expect(
			await upsert(
				unitOfWork,
				items,
				{
					key: "a",
					title: "edit",
					description: null,
				},
				{
					eventTime: t2,
				},
			),
		).toEqual(
			{
				table: "item",
				key:
				{
					key: "a",
				},
				outcome: "skipped-stale",
			},
		);
	});
});

describe("composite versions", () =>
{
	const saveComposite = async (now: number, title: string, counts: Record<number, number>) =>
	{
		const unitOfWork = createUnitOfWork(db, now);
		const itemChange = await upsert(
			unitOfWork,
			items,
			{
				key: "a",
				title,
				description: null,
			},
		);
		const partChanges = await mergeList(
			unitOfWork,
			parts,
			{
				itemKey: "a",
			},
			Object.entries(counts).map(([position, count]) => (
			{
				itemKey: "a",
				position: Number(position),
				count,
			})),
		);
		const versionChange = await bumpVersion(
			unitOfWork,
			versions,
			{
				key: "a",
			},
			[itemChange, ...partChanges],
		);
		const again = await bumpVersion(
			unitOfWork,
			versions,
			{
				key: "a",
			},
			partChanges,
		);
		await commit(unitOfWork);
		return [versionChange, again];
	};

	const versionRow = (number: number, from: number, to = SYSTEM_TO_SENTINEL) => (
	{
		key: "a",
		number,
		systemFrom: from,
		systemTo: to,
		systemFromText: text(from),
		systemToText: to === SYSTEM_TO_SENTINEL ? sentinelText : text(to),
	});

	it("bumps the version once per unit of work when member tables change", async () =>
	{
		expect(
			await saveComposite(
				t1,
				"first",
				{
					1: 10,
				},
			),
		).toEqual([
			{
				table: "item_version",
				key:
				{
					key: "a",
				},
				outcome: "inserted",
			},
			{
				table: "item_version",
				key:
				{
					key: "a",
				},
				outcome: "unchanged",
			},
		]);
		expect(
			await saveComposite(
				t2,
				"second",
				{
					1: 11,
					2: 20,
				},
			),
		).toEqual([
			{
				table: "item_version",
				key:
				{
					key: "a",
				},
				outcome: "updated",
			},
			{
				table: "item_version",
				key:
				{
					key: "a",
				},
				outcome: "unchanged",
			},
		]);
		expect(
			await saveComposite(
				t3,
				"second",
				{
					1: 11,
					2: 20,
				},
			),
		).toEqual([
			{
				table: "item_version",
				key:
				{
					key: "a",
				},
				outcome: "unchanged",
			},
			{
				table: "item_version",
				key:
				{
					key: "a",
				},
				outcome: "unchanged",
			},
		]);

		expect(
			await history(
				db,
				versions,
				{
					key: "a",
				},
			),
		).toEqual([versionRow(1, t1, t2), versionRow(2, t2)]);
	});

	it("leaves the version alone when only a stale event arrived", async () =>
	{
		await saveComposite(
			t2,
			"first",
			{
				1: 10,
			},
		);

		const unitOfWork = createUnitOfWork(db, t3);
		const stale = await upsert(
			unitOfWork,
			items,
			{
				key: "a",
				title: "old",
				description: null,
			},
			{
				eventTime: t1,
			},
		);

		expect(
			await bumpVersion(
				unitOfWork,
				versions,
				{
					key: "a",
				},
				[stale],
			),
		).toEqual(
			{
				table: "item_version",
				key:
				{
					key: "a",
				},
				outcome: "unchanged",
			},
		);
	});
});

describe("content-addressed tables", () =>
{
	it("inserts a row once and never overwrites it", async () =>
	{
		const first = createUnitOfWork(db, t1);
		expect(
			await insertIfAbsent(
				first,
				contents,
				{
					sha: "abc",
					createdById: "alice",
					byteLength: 3,
				},
			),
		).toEqual(
			{
				table: "content",
				key:
				{
					sha: "abc",
				},
				outcome: "inserted",
			},
		);
		await commit(first);

		const second = createUnitOfWork(db, t2);
		expect(
			await insertIfAbsent(
				second,
				contents,
				{
					sha: "abc",
					createdById: "bob",
					byteLength: 3,
				},
			),
		).toEqual(
			{
				table: "content",
				key:
				{
					sha: "abc",
				},
				outcome: "unchanged",
			},
		);
		await commit(second);

		expect(await db.select().from(content)).toEqual([
			{
				sha: "abc",
				createdById: "alice",
				byteLength: 3,
			},
		]);
	});

	it("does not overwrite a row a concurrent unit of work inserted first", async () =>
	{
		const slow = createUnitOfWork(db, t1);
		await insertIfAbsent(
			slow,
			contents,
			{
				sha: "abc",
				createdById: "slow",
				byteLength: 3,
			},
		);

		const fast = createUnitOfWork(db, t1);
		await insertIfAbsent(
			fast,
			contents,
			{
				sha: "abc",
				createdById: "fast",
				byteLength: 3,
			},
		);
		await commit(fast);

		expect(await commit(slow)).toEqual(
			{
				status: "committed",
				changes: [
					{
						table: "content",
						key:
						{
							sha: "abc",
						},
						outcome: "unchanged",
					},
				],
			},
		);
		expect(await db.select().from(content)).toEqual([
			{
				sha: "abc",
				createdById: "fast",
				byteLength: 3,
			},
		]);
	});
});

describe("concurrent units of work", () =>
{
	it("rolls back an update whose current row changed after it was compared", async () =>
	{
		await saveItem(t1, "first");

		const slow = createUnitOfWork(db, t3);
		await upsert(
			slow,
			items,
			{
				key: "a",
				title: "slow",
				description: null,
			},
		);
		await upsert(
			slow,
			parts,
			{
				itemKey: "a",
				position: 1,
				count: 1,
			},
		);

		await saveItem(t2, "fast");

		expect(await commit(slow)).toEqual(
			{
				status: "conflict",
				changes: [
					{
						table: "item",
						key:
						{
							key: "a",
						},
						outcome: "conflict",
					},
					{
						table: "item_part",
						key:
						{
							itemKey: "a",
							position: 1,
						},
						outcome: "conflict",
					},
				],
			},
		);
		expect(
			await history(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual([itemRow("first", null, t1, t2), itemRow("fast", null, t2)]);
		expect(
			await history(
				db,
				parts,
				{
					itemKey: "a",
					position: 1,
				},
			),
		).toEqual([]);
	});

	it("rolls back an update whose current row was phased out after it was compared", async () =>
	{
		await saveItem(t1, "first");

		const slow = createUnitOfWork(db, t3);
		await upsert(
			slow,
			items,
			{
				key: "a",
				title: "slow",
				description: null,
			},
		);

		const deletion = createUnitOfWork(db, t2);
		await phaseOut(
			deletion,
			items,
			{
				key: "a",
			},
		);
		await commit(deletion);

		expect((await commit(slow)).status).toEqual("conflict");
		expect(
			await history(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual([itemRow("first", null, t1, t2)]);
	});

	it("rolls back a phase-out whose current row changed after it was compared", async () =>
	{
		await saveItem(t1, "first");

		const slow = createUnitOfWork(db, t3);
		await phaseOut(
			slow,
			items,
			{
				key: "a",
			},
		);

		await saveItem(t2, "fast");

		expect((await commit(slow)).status).toEqual("conflict");
		expect(
			await findCurrent(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual(itemRow("fast", null, t2));
	});

	it("rolls back an insert when a concurrent unit of work inserted the same key", async () =>
	{
		const slow = createUnitOfWork(db, t2);
		await upsert(
			slow,
			items,
			{
				key: "a",
				title: "slow",
				description: null,
			},
		);

		await saveItem(t1, "fast");

		expect((await commit(slow)).status).toEqual("conflict");
		expect(
			await history(
				db,
				items,
				{
					key: "a",
				},
			),
		).toEqual([itemRow("fast", null, t1)]);
	});
});
