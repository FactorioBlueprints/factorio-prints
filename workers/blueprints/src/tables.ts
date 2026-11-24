// Temporal and content-addressed descriptors for the tables the Worker writes. The blueprint and vote descriptors
// carry the hooks that keep blueprint_vote_summary in step, so they come from voteSummary.ts.
import
{
	blueprintCollectionEntry,
	blueprintGameData,
	blueprintGameDataEntity,
	blueprintGameDataIcon,
	blueprintGameDataRecipe,
	blueprintPrivateData,
	blueprintString,
	blueprintStringMod,
	blueprintTag,
	blueprintVersion,
	comment,
	commentVersion,
	firebaseUser,
	firebaseUserVersion,
	imgurImage,
	tag,
	userEntitlement,
} from "./schema.ts";
import {contentAddressedTable, temporalTable} from "./temporal/temporal.ts";

export {blueprints, votes} from "./voteSummary.ts";

export const blueprintVersions = temporalTable(blueprintVersion, ["key"]);
export const blueprintTags = temporalTable(blueprintTag, ["blueprintKey", "tagCategory", "tagName"]);
export const blueprintPrivateDatas = temporalTable(blueprintPrivateData, ["key"]);
export const imgurImages = temporalTable(imgurImage, ["imgurId"]);
export const tags = temporalTable(tag, ["category", "name"]);
export const blueprintCollectionEntries = temporalTable(blueprintCollectionEntry, ["userId", "blueprintKey"]);
export const userEntitlements = temporalTable(userEntitlement, ["userId", "userRole"]);
export const firebaseUsers = temporalTable(firebaseUser, ["userId"]);
export const firebaseUserVersions = temporalTable(firebaseUserVersion, ["userId"]);
export const comments = temporalTable(comment, ["id"]);
export const commentVersions = temporalTable(commentVersion, ["id"]);

export const blueprintStrings = contentAddressedTable(blueprintString, ["sha"]);
export const blueprintGameDatas = contentAddressedTable(blueprintGameData, ["sha", "position"]);
export const blueprintGameDataIcons = contentAddressedTable(blueprintGameDataIcon, ["sha", "position", "index"]);
export const blueprintGameDataRecipes = contentAddressedTable(blueprintGameDataRecipe, ["sha", "position", "recipe"]);
export const blueprintGameDataEntities = contentAddressedTable(blueprintGameDataEntity, ["sha", "position", "entity"]);
export const blueprintStringMods = contentAddressedTable(blueprintStringMod, ["blueprintStringSha", "modPackName"]);
