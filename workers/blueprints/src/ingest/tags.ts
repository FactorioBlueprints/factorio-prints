// Port of the reference converter's tag categories and blueprint tag parsing.
import type {RealtimeByTag} from "./realtime.ts";
import type {TagCategory, TagRow} from "./rows.ts";

const TAG_CATEGORIES: readonly TagCategory[] = [
	"belt",
	"circuit",
	"combat",
	"general",
	"moderation",
	"mods",
	"power",
	"production",
	"train",
	"version",
	"planets",
];

const isTagCategory = (category: string): category is TagCategory =>
	(TAG_CATEGORIES as readonly string[]).includes(category);

/**
 * Splits a Realtime tag like `/belt/balancer/` (the slashes are optional) into its category and name, or returns
 * `undefined` for a category outside the Klass `TagCategory` enumeration, which Firebase accepts but the model does not.
 */
export const parseTag = (
	tag: string,
):
	|
	  {
			category: TagCategory;
			name: string;
	  }
	| undefined =>
{
	const firstSegment = tag.split("/").find((segment) => segment !== "");
	if (firstSegment === undefined || !isTagCategory(firstSegment))
	{
		return undefined;
	}
	const sanitized = `${tag.startsWith("/") ? "" : "/"}${tag}${tag.endsWith("/") ? "" : "/"}`;
	const [, category, name] = sanitized.split("/");
	return isTagCategory(category) && name !== undefined
		?
			{
				category,
				name,
			}
		: undefined;
};

/**
 * Collapses older `/byTag` keys like `mods%2Fbobs` into their category and name. The converter moves their blueprints
 * under the decoded path, which already exists.
 */
const decodeByTagKeys = (byTag: RealtimeByTag): Map<string, string[]> =>
{
	const names = new Map<string, string[]>();
	for (const [key, value] of Object.entries(byTag))
	{
		const decoded = decodeURIComponent(key.replaceAll("+", " "));
		if (decoded === key)
		{
			names.set(key, [...(names.get(key) ?? []), ...Object.keys(value)]);
			continue;
		}
		const separator = decoded.indexOf("/");
		if (separator === -1)
		{
			throw new Error(`URL-decoded byTag key ${decoded} has no category`);
		}
		const category = decoded.slice(0, separator);
		names.set(category, [...(names.get(category) ?? []), decoded.slice(separator + 1)]);
	}
	return names;
};

/**
 * Maps `/byTag` to `tag` rows. A tag keeps its existing ordinal; new tags are numbered after the highest existing one,
 * in `/byTag` order. Categories outside the Klass enumeration are skipped.
 */
export const mapTagList = (byTag: RealtimeByTag, existingTags: readonly TagRow[]): TagRow[] =>
{
	const ordinals = new Map(
		existingTags.map((existing) => [`${existing.category}/${existing.name}`, existing.ordinal]),
	);
	let nextOrdinal = Math.max(0, ...existingTags.map((existing) => existing.ordinal)) + 1;
	const rows = new Map<string, TagRow>();
	for (const [category, names] of decodeByTagKeys(byTag))
	{
		if (!isTagCategory(category))
		{
			continue;
		}
		for (const name of names)
		{
			const key = `${category}/${name}`;
			if (rows.has(key))
			{
				continue;
			}
			let ordinal = ordinals.get(key);
			if (ordinal === undefined)
			{
				ordinal = nextOrdinal;
				nextOrdinal++;
			}
			rows.set(
				key,
				{
					category,
					name,
					ordinal,
				},
			);
		}
	}
	return [...rows.values()];
};
