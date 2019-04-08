import * as actionTypes from './actionTypes';

export const subscribeToBlueprint = blueprintId =>
	({
		type: actionTypes.SUBSCRIBE_TO_BLUEPRINT,
		blueprintId,
	});

export const goToPreviousSummaries = () =>
	({
		type: actionTypes.GO_TO_PREVIOUS_SUMMARIES,
	});

export const goToNextSummaries = () =>
	({
		type: actionTypes.GO_TO_NEXT_SUMMARIES,
	});

export const goToFirstSummaries = () =>
	({
		type: actionTypes.GO_TO_FIRST_SUMMARIES,
	});

export const goToPreviousAllFavorites = () =>
	({
		type: actionTypes.GO_TO_PREVIOUS_ALL_FAVORITES,
	});

export const goToNextAllFavorites = () =>
	({
		type: actionTypes.GO_TO_NEXT_ALL_FAVORITES,
	});

export const goToFirstAllFavorites = () =>
	({
		type: actionTypes.GO_TO_FIRST_ALL_FAVORITES,
	});

export const subscribeToBlueprintSummaries = page =>
	({
		type: actionTypes.SUBSCRIBE_TO_SUMMARIES,
		page,
	});

export const subscribeToAllFavorites = page =>
	({
		type: actionTypes.SUBSCRIBE_TO_ALL_FAVORITES,
		page,
	});

export const subscribeToModerators = () =>
	({
		type: actionTypes.SUBSCRIBE_TO_MODERATORS,
	});

export const subscribeToTags = () =>
	({
		type: actionTypes.SUBSCRIBE_TO_TAGS,
	});

export const subscribeToUser = userId =>
	({
		type: actionTypes.SUBSCRIBE_TO_USER,
		userId,
	});

export const subscribeToUserDisplayName = userId =>
	({
		type: actionTypes.SUBSCRIBE_TO_USER_DISPLAY_NAME,
		userId,
	});

export const authStateChanged = (user, idToken) =>
	({
		type: actionTypes.AUTH_STATE_CHANGED,
		user,
		idToken,
	});

export const editedDisplayName = displayName =>
	({
		type: actionTypes.EDITED_DISPLAY_NAME,
		displayName,
	});

export const filterOnTags = tags =>
	({
		type: actionTypes.FILTER_ON_TAGS,
		tags,
	});

export const filterOnTitle = title =>
	({
		type: actionTypes.FILTER_ON_TITLE,
		title,
	});
