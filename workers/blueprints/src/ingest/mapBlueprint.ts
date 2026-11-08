// Port of the reference converter's blueprint mapping: the blueprint, its private node, its thumbnails and the
// merge of duplicate images.
import type {RealtimeBlueprint, RealtimeBlueprintPrivate} from "./realtime.ts";
import type {BlueprintRows, BlueprintTagRow, ImgurImageRow} from "./rows.ts";
import {parseTag} from "./tags.ts";

const MAX_TITLE_LENGTH = 512;
const MAX_DESCRIPTION_LENGTH = 262_144;

export interface BlueprintContext
{
	/** `/blueprintsPrivate/<key>`, which overrides the private fields stored on the blueprint itself. */
	blueprintPrivate?: RealtimeBlueprintPrivate | null;
	/** `/thumbnails/<key>`, used only when neither the blueprint nor its private node has a thumbnail. */
	thumbnail?: string | null;
}

/** Lowercase hex SHA-1 of the UTF-8 bytes, the key of the blueprint string in R2 and `blueprint_string`. */
const sha1Hex = async (text: string): Promise<string> =>
{
	const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const truncate = (text: string, maxLength: number) => (text.length > maxLength ? text.slice(0, maxLength) : text);

const mapTitle = (title: string | null | undefined) =>
	title === null || title === undefined || title === "" ? "Untitled" : truncate(title, MAX_TITLE_LENGTH);

const mapTags = (key: string, tags: RealtimeBlueprint["tags"]): BlueprintTagRow[] =>
{
	const rows = new Map<string, BlueprintTagRow>();
	for (const raw of Object.values(tags ?? {}))
	{
		const parsed = parseTag(raw);
		if (parsed !== undefined)
		{
			rows.set(
				`${parsed.category}/${parsed.name}`,
				{
					blueprintKey: key,
					tagCategory: parsed.category,
					tagName: parsed.name,
				},
			);
		}
	}
	return [...rows.values()];
};

/**
 * Maps one `/blueprints/<key>` node to its rows, or `undefined` when it has no blueprint string, which the converter
 * skips as invalid. The string itself goes to R2; only its SHA-1 is referenced here.
 */
export const mapBlueprint = async (
	key: string,
	realtime: RealtimeBlueprint,
	context: BlueprintContext,
): Promise<BlueprintRows | undefined> =>
{
	const blueprintString = realtime.blueprintString;
	if (blueprintString === null || blueprintString === undefined)
	{
		return undefined;
	}

	const authorId = realtime.authorId ?? realtime.author?.userId;
	const createdOn = realtime.createdDate;
	const image = realtime.image;
	if (!authorId || createdOn === null || createdOn === undefined || !image?.type)
	{
		throw new Error(`Blueprint ${key} has no author, created date or image type`);
	}

	let firebaseImageUrl = realtime.imageUrl ?? null;
	let fileName = realtime.fileName ?? null;
	let thumbnailData = realtime.thumbnail ?? null;
	let deleteHash = image.deletehash ?? null;

	// The private node wins for the image URL and delete hash even when it lacks them, as in cleanseBlueprintsPrivate.
	const blueprintPrivate = context.blueprintPrivate;
	if (blueprintPrivate)
	{
		fileName = blueprintPrivate.fileName ?? fileName;
		firebaseImageUrl = blueprintPrivate.imageUrl ?? null;
		thumbnailData ??= blueprintPrivate.thumbnail ?? null;
		deleteHash = blueprintPrivate.deletehash ?? null;
	}
	if (context.thumbnail !== null && context.thumbnail !== undefined && !thumbnailData)
	{
		thumbnailData = context.thumbnail;
	}

	const audit =
	{
		createdById: authorId,
		createdOn,
		lastUpdatedById: authorId,
	};

	return {
		blueprint:
		{
			key,
			imgurImageId: image.id,
			blueprintStringSha: await sha1Hex(blueprintString),
			...audit,
			title: mapTitle(realtime.title),
			descriptionMarkdown: truncate(
				realtime.descriptionMarkdown ?? "TODO: Add description",
				MAX_DESCRIPTION_LENGTH,
			),
		},
		blueprintVersion:
		{
			key,
			...audit,
		},
		blueprintTags: mapTags(key, realtime.tags),
		blueprintPrivateData:
		{
			key,
			firebaseImageUrl,
			thumbnailData,
			fileName,
		},
		imgurImage:
		{
			imgurId: image.id,
			imgurType: image.type,
			deleteHash,
			height: image.height ?? 0,
			width: image.width ?? 0,
		},
	};
};

/**
 * Collapses images that several blueprints share into one row per imgur id. The first occurrence wins, and later
 * ones only fill its missing delete hash and type and its zero dimensions.
 */
export const mergeImgurImages = (images: readonly ImgurImageRow[]): ImgurImageRow[] =>
{
	const merged = new Map<string, ImgurImageRow>();
	for (const image of images)
	{
		const first = merged.get(image.imgurId);
		if (first === undefined)
		{
			merged.set(
				image.imgurId,
				{
					...image,
				},
			);
			continue;
		}
		first.deleteHash ??= image.deleteHash;
		if (!first.height && image.height)
		{
			first.height = image.height;
		}
		if (!first.width && image.width)
		{
			first.width = image.width;
		}
		first.imgurType ??= image.imgurType;
	}
	return [...merged.values()];
};
