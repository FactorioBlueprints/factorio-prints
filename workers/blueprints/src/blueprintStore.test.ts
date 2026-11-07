import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {beforeEach, describe, expect, it} from "vite-plus/test";
import
{
	deleteBlueprint,
	readBlueprint,
	upsertBlueprint,
	type BlueprintStorage,
	type SqlDatabase,
} from "./blueprintStore.ts";

const createDatabase = (): SqlDatabase =>
{
	const sqlite = new DatabaseSync(":memory:");
	sqlite.exec(readFileSync(join(process.cwd(), "workers/blueprints/migrations/0001_blueprints.sql"), "utf8"));
	return {
		prepare: (sql: string) =>
		{
			let bound: unknown[] = [];
			const statement =
			{
				bind: (...values: unknown[]) =>
				{
					bound = values;
					return statement;
				},
				first: async () => (sqlite.prepare(sql).get(...(bound as never[])) as never) ?? null,
				run: async () =>
				{
					const result = sqlite.prepare(sql).run(...(bound as never[]));
					return {
						meta:
						{
							changes: Number(result.changes),
						},
					};
				},
			};
			return statement;
		},
	} as unknown as SqlDatabase;
};

const createBucket = ():
{
	bucket: BlueprintStorage["strings"];
	objects: Map<string, string>;
} =>
{
	const objects = new Map<string, string>();
	return {
		objects,
		bucket:
		{
			put: async (key: string, value: string) =>
			{
				objects.set(key, value);
			},
			get: async (key: string) =>
			{
				const value = objects.get(key);
				return value === undefined
					? null
					:
						{
							text: async () => value,
						};
			},
			delete: async (key: string) =>
			{
				objects.delete(key);
			},
		},
	};
};

const blueprint =
{
	title: "Smelter",
	authorId: "user-1",
	author:
	{
		userId: "user-1",
		displayName: "Alice",
	},
	createdDate: 500,
	lastUpdatedDate: 1000,
	numberOfFavorites: 2,
	favorites:
	{
		"user-2": true,
		"user-3": true,
	},
	tags: ["/smelting/"],
	blueprintString: "0eNqrVkrKKU0tKMrMTS1WsqpWyi5NLwVSQBYDm9j",
};

describe("blueprint store", () =>
{
	let storage: BlueprintStorage;
	let objects: Map<string, string>;

	beforeEach(() =>
	{
		const created = createBucket();
		objects = created.objects;
		storage =
		{
			database: createDatabase(),
			strings: created.bucket,
		};
	});

	it("round-trips a blueprint with its original shape, moving the string to object storage", async () =>
	{
		await upsertBlueprint(storage, "bp-1", blueprint);

		expect([...objects.values()]).toStrictEqual([blueprint.blueprintString]);
		expect(await readBlueprint(storage, "bp-1")).toStrictEqual(blueprint);
	});

	it("round-trips a blueprint that has no string", async () =>
	{
		const {blueprintString: _omitted, ...withoutString} = blueprint;

		await upsertBlueprint(storage, "bp-2", withoutString);

		expect(objects.size).toBe(0);
		expect(await readBlueprint(storage, "bp-2")).toStrictEqual(withoutString);
	});

	it("returns null for an unknown blueprint", async () =>
	{
		expect(await readBlueprint(storage, "missing")).toBeNull();
	});

	it("replaces an older version with a newer one", async () =>
	{
		await upsertBlueprint(storage, "bp-1", blueprint);
		const newer =
		{
			...blueprint,
			title: "Smelter v2",
			lastUpdatedDate: 2000,
			blueprintString: "newer",
		};

		await upsertBlueprint(storage, "bp-1", newer);

		expect(await readBlueprint(storage, "bp-1")).toStrictEqual(newer);
	});

	it("ignores an out-of-order older write", async () =>
	{
		const newer =
		{
			...blueprint,
			lastUpdatedDate: 2000,
		};
		await upsertBlueprint(storage, "bp-1", newer);

		const applied = await upsertBlueprint(storage, "bp-1", blueprint);

		expect(applied).toBe(false);
		expect(await readBlueprint(storage, "bp-1")).toStrictEqual(newer);
	});

	it("applies a write with an equal timestamp so favorite changes land", async () =>
	{
		await upsertBlueprint(storage, "bp-1", blueprint);
		const sameTimeMoreFavorites =
		{
			...blueprint,
			numberOfFavorites: 3,
			favorites:
			{
				...blueprint.favorites,
				"user-4": true,
			},
		};

		const applied = await upsertBlueprint(storage, "bp-1", sameTimeMoreFavorites);

		expect(applied).toBe(true);
		expect(await readBlueprint(storage, "bp-1")).toStrictEqual(sameTimeMoreFavorites);
	});

	it("deletes the row and the stored string", async () =>
	{
		await upsertBlueprint(storage, "bp-1", blueprint);

		await deleteBlueprint(storage, "bp-1");

		expect(await readBlueprint(storage, "bp-1")).toBeNull();
		expect(objects.size).toBe(0);
	});

	it("rejects a body without a numeric lastUpdatedDate", async () =>
	{
		await expect(
			upsertBlueprint(
				storage,
				"bp-1",
				{
					title: "x",
				},
			),
		).rejects.toThrow("lastUpdatedDate");
	});
});
