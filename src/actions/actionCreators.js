import {
	SUBSCRIBE_TO_BLUEPRINT,
	SUBSCRIBE_TO_SUMMARIES,
	SUBSCRIBE_TO_MODERATORS,
	SUBSCRIBE_TO_TAGS,
	SUBSCRIBE_TO_TAG,
	SUBSCRIBE_TO_USER,
	SUBSCRIBE_TO_USER_DISPLAY_NAME,
	AUTH_STATE_CHANGED,
	FILTER_ON_TAGS,
	FILTER_ON_TITLE,
} from './actionTypes';

export const subscribeToBlueprint = blueprintId =>
({
	type: SUBSCRIBE_TO_BLUEPRINT,
	blueprintId,
});

export const subscribeToBlueprintSummaries = () =>
({
	type: SUBSCRIBE_TO_SUMMARIES,
});

export const subscribeToModerators = () =>
({
	type: SUBSCRIBE_TO_MODERATORS,
});

export const subscribeToTags = () =>
({
	type: SUBSCRIBE_TO_TAGS,
});

export const subscribeToTag = tagId =>
({
	type: SUBSCRIBE_TO_TAG,
	tagId,
});

export const subscribeToUser = userId =>
({
	type: SUBSCRIBE_TO_USER,
	userId,
});

export const subscribeToUserDisplayName = userId =>
({
	type: SUBSCRIBE_TO_USER_DISPLAY_NAME,
	userId,
});

export const authStateChanged = user =>
({
	type: AUTH_STATE_CHANGED,
	user,
});

export const filterOnTags = tags =>
({
	type: FILTER_ON_TAGS,
	tags,
});

export const filterOnTitle = title =>
({
	type: FILTER_ON_TITLE,
	title,
});
