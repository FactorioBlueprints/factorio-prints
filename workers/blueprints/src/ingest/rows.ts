import type
{
	blueprint,
	blueprintCollectionEntry,
	blueprintPrivateData,
	blueprintTag,
	blueprintVersion,
	comment,
	firebaseUser,
	imgurImage,
	tag,
	userEntitlement,
	vote,
} from "../schema.ts";
import type {TemporalValues} from "../temporal/temporal.ts";

export type BlueprintRow = TemporalValues<typeof blueprint>;
/** `number` is left to the temporal module's version bump, because it depends on history. */
export type BlueprintVersionRow = Omit<TemporalValues<typeof blueprintVersion>, "number">;
export type BlueprintTagRow = TemporalValues<typeof blueprintTag>;
export type BlueprintPrivateDataRow = TemporalValues<typeof blueprintPrivateData>;
export type ImgurImageRow = TemporalValues<typeof imgurImage>;
export type TagRow = TemporalValues<typeof tag>;
export type VoteRow = TemporalValues<typeof vote>;
export type BlueprintCollectionEntryRow = TemporalValues<typeof blueprintCollectionEntry>;
export type UserEntitlementRow = TemporalValues<typeof userEntitlement>;
export type FirebaseUserRow = TemporalValues<typeof firebaseUser>;
export type CommentRow = TemporalValues<typeof comment>;

export type TagCategory = TagRow["category"];

/** Every row one `/blueprints/<key>` node becomes. */
export interface BlueprintRows
{
	blueprint: BlueprintRow;
	blueprintVersion: BlueprintVersionRow;
	blueprintTags: BlueprintTagRow[];
	blueprintPrivateData: BlueprintPrivateDataRow;
	imgurImage: ImgurImageRow;
}
