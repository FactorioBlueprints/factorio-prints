// Public reads, current rows only (system_to = sentinel), in the legacy Realtime shapes the site and the Discord bot
// already parse (rawBlueprintSchema and rawBlueprintSummaryPageSchema in src/schemas.ts). History is never served
// publicly, which is what lets a phase-out stand in for deletion. Private fields (image URL, file name, imgur
// delete hash, thumbnail) are left out.
import {and, eq} from "drizzle-orm";
import {blueprintVoteSummary, vote} from "../schema.ts";
import {getBlueprintString} from "../strings.ts";
import {blueprints, blueprintTags, blueprintVersions, firebaseUsers, imgurImages} from "../tables.ts";
import {SYSTEM_TO_SENTINEL} from "../temporal/columns.ts";
import {type Database, findCurrent, history} from "../temporal/temporal.ts";

export interface LegacyBlueprint
{
	title: string;
	blueprintString: string;
	createdDate: number;
	descriptionMarkdown: string;
	lastUpdatedDate: number;
	numberOfFavorites: number;
	tags: string[];
	authorId: string;
	author:
	{
		userId: string;
		displayName?: string;
	};
	image:
	{
		id: string;
		type: string;
		height: number;
		width: number;
	};
	favorites: Record<string, true>;
}

/** The blueprint and the instant its composite last changed (the ETag), or undefined when it is not current. */
export const readBlueprint = async (
	db: Database,
	strings: R2Bucket,
	key: string,
): Promise<
	|
	  {
			blueprint: LegacyBlueprint;
			lastUpdated: number;
	  }
	| undefined
> =>
{
	const row = await findCurrent(
		db,
		blueprints,
		{
			key,
		},
	);
	const version = await findCurrent(
		db,
		blueprintVersions,
		{
			key,
		},
	);
	if (row === undefined || version === undefined) return undefined;

	const [tags, image, author, upVotes, [summary], blueprintString] = await Promise.all([
		history(
			db,
			blueprintTags,
			{
				blueprintKey: key,
			},
		),
		findCurrent(
			db,
			imgurImages,
			{
				imgurId: row.imgurImageId,
			},
		),
		findCurrent(
			db,
			firebaseUsers,
			{
				userId: row.createdById,
			},
		),
		db
			.select(
				{
					userId: vote.userId,
				},
			)
			.from(vote)
			.where(and(eq(vote.blueprintKey, key), eq(vote.direction, "up"), eq(vote.systemTo, SYSTEM_TO_SENTINEL))),
		db
			.select(
				{
					count: blueprintVoteSummary.numberOfUpvotes,
				},
			)
			.from(blueprintVoteSummary)
			.where(eq(blueprintVoteSummary.key, key)),
		getBlueprintString(strings, row.blueprintStringSha),
	]);
	if (blueprintString === null)
	{
		throw new Error(`Blueprint ${key} references string ${row.blueprintStringSha}, missing from R2`);
	}

	return {
		lastUpdated: version.systemFrom,
		blueprint:
		{
			title: row.title,
			blueprintString,
			createdDate: row.createdOn,
			descriptionMarkdown: row.descriptionMarkdown,
			lastUpdatedDate: version.systemFrom,
			numberOfFavorites: summary?.count ?? 0,
			tags: tags
				.filter((tag) => tag.systemTo === SYSTEM_TO_SENTINEL)
				.map((tag) => `/${tag.tagCategory}/${tag.tagName}/`),
			authorId: row.createdById,
			author:
				author === undefined
					?
						{
							userId: row.createdById,
						}
					:
						{
							userId: row.createdById,
							displayName: author.displayName,
						},
			image:
			{
				id: row.imgurImageId,
				type: image?.imgurType ?? "image/png",
				height: image?.height ?? 0,
				width: image?.width ?? 0,
			},
			favorites: Object.fromEntries(upVotes.map(({userId}) => [userId, true as const])),
		},
	};
};

export interface SummaryQuery
{
	orderBy: "lastUpdatedDate" | "numberOfFavorites";
	limit: number;
	/** Keyset pagination: the last value and key of the previous page. */
	endBefore?:
	{
		value: number;
		key: string;
	};
	/** Only blueprints whose composite changed after this instant. */
	since?: number;
}

interface SummaryRow
{
	key: string;
	title: string;
	imgur_id: string;
	imgur_type: string | null;
	height: number | null;
	width: number | null;
	number_of_favorites: number;
	last_updated: number;
	order_value: number;
}

const ORDER_COLUMNS: Record<SummaryQuery["orderBy"], string> =
{
	lastUpdatedDate: "v.system_from",
	numberOfFavorites: "COALESCE(s.number_of_upvotes, 0)",
};

/** One page of current blueprint summaries, newest or most favorited first, in the legacy page shape. */
export const readSummaries = async (database: D1Database, query: SummaryQuery) =>
{
	const order = ORDER_COLUMNS[query.orderBy];
	const conditions = [`b.system_to = ${SYSTEM_TO_SENTINEL}`];
	const params: (string | number)[] = [];
	if (query.endBefore !== undefined)
	{
		conditions.push(`(${order}, b.key) < (?, ?)`);
		params.push(query.endBefore.value, query.endBefore.key);
	}
	if (query.since !== undefined)
	{
		conditions.push("v.system_from > ?");
		params.push(query.since);
	}
	const {results} = await database
		.prepare(
			`SELECT b.key, b.title, b.imgur_image_id AS imgur_id, i.imgur_type, i.height, i.width,
				COALESCE(s.number_of_upvotes, 0) AS number_of_favorites, v.system_from AS last_updated,
				${order} AS order_value
			FROM blueprint b
			JOIN blueprint_version v ON v.key = b.key AND v.system_to = ${SYSTEM_TO_SENTINEL}
			LEFT JOIN imgur_image i ON i.imgur_id = b.imgur_image_id AND i.system_to = ${SYSTEM_TO_SENTINEL}
			LEFT JOIN blueprint_vote_summary s ON s.key = b.key
			WHERE ${conditions.join(" AND ")}
			ORDER BY order_value DESC, b.key DESC
			LIMIT ?`,
		)
		.bind(...params, query.limit + 1)
		.all<SummaryRow>();

	const page = results.slice(0, query.limit);
	const last = page.at(-1);
	return {
		data: Object.fromEntries(
			page.map((row) => [
				row.key,
				{
					title: row.title,
					imgurId: row.imgur_id,
					imgurType: row.imgur_type ?? "image/png",
					numberOfFavorites: row.number_of_favorites,
					lastUpdatedDate: row.last_updated,
					height: row.height ?? 0,
					width: row.width ?? 0,
				},
			]),
		),
		lastKey: last?.key ?? null,
		lastValue: last?.order_value ?? null,
		hasMore: results.length > query.limit,
	};
};
