// Port of the reference converter's comment cleansing.
import type {RealtimeComment} from "./realtime.ts";
import type {CommentRow} from "./rows.ts";

const MAX_TEXT_LENGTH = 1_048_576;

/**
 * Maps `/comments/<blueprintKey>` to `comment` rows. Comments without content or a creation time are skipped, as are
 * all comments on a blueprint that does not exist.
 */
export const mapComments = (
	blueprintKey: string,
	comments: Readonly<Record<string, RealtimeComment>>,
	context:
	{
		blueprintKeys: ReadonlySet<string>;
	},
): CommentRow[] =>
{
	if (!context.blueprintKeys.has(blueprintKey))
	{
		return [];
	}
	return Object.entries(comments).flatMap(([id, realtime]) =>
	{
		const {content, createdAt, authorId} = realtime;
		if (!content || createdAt === null || createdAt === undefined || !authorId)
		{
			return [];
		}
		const row: CommentRow =
		{
			id,
			replyToId: realtime.parentId ?? null,
			createdById: authorId,
			createdOn: Number(createdAt),
			lastUpdatedById: authorId,
			blueprintKey,
			text: content.length > MAX_TEXT_LENGTH ? content.slice(0, MAX_TEXT_LENGTH) : content,
			deleted: realtime.isDeleted === true,
		};
		return [row];
	});
};
