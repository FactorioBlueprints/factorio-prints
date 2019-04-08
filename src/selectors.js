import get                     from 'lodash/get';
import mapValues               from 'lodash/mapValues';
import {createSelector}        from 'reselect';
import {initialBlueprintState} from './reducers/blueprintsReducer';
import {initialUserState}      from './reducers/usersReducer';

export const getUid                          = storeState => get(storeState, [
	'auth',
	'user',
	'uid',
]);
export const getDisplayName                  = storeState => get(storeState, [
	'auth',
	'user',
	'displayName',
]);
export const getPhotoURL                     = storeState => get(storeState, [
	'auth',
	'user',
	'photoURL',
]);
export const getUsers                        = storeState => storeState.users;
export const getBlueprintSummariesData       = storeState => storeState.blueprintSummaries.data;
export const getBlueprintSummariesLoading    = storeState => storeState.blueprintSummaries.loading;
export const getBlueprintMyFavoritesData     = storeState => storeState.blueprintMyFavorites.data;
export const getBlueprintMyFavoritesLoading  = storeState => storeState.blueprintMyFavorites.loading;
export const getBlueprintAllFavoritesData    = storeState => storeState.blueprintAllFavorites.data;
export const getBlueprintAllFavoritesLoading = storeState => storeState.blueprintAllFavorites.loading;
export const getRawByTag                     = storeState => storeState.byTag;
export const getTags                         = storeState => storeState.tags.data;
export const getLoadingTags                  = storeState => storeState.tags.loading;
export const getFilteredTags                 = storeState => storeState.filteredTags;
export const getTitleFilter                  = storeState => storeState.titleFilter;
export const getModerators                   = storeState => storeState.my.entitlements.data;

export const getIsModerator = createSelector(
	[
		getUid,
		getModerators,
	],
	(uid, moderators) => moderators[uid] === true,
);

export const getFilteredUser = createSelector(
	[
		getUid,
		getDisplayName,
	],
	(uid, displayName) =>
	{
		if (uid || displayName)
		{
			return {uid, displayName};
		}
		return undefined;
	},
);

export const getUser = createSelector(
	[
		getUid,
		getDisplayName,
		getPhotoURL,
	],
	(uid, displayName, photoURL) =>
	{
		if (uid || displayName || photoURL)
		{
			return {uid, displayName, photoURL};
		}
		return undefined;
	},
);

export const getMyBlueprints = createSelector(
	[
		getUid,
		getUsers,
	],
	(uid, users) =>
	{
		if (users && uid)
		{
			return get(users, [uid, 'blueprints', 'data'], initialUserState.blueprints.userBlueprintsKeys);
		}
		return initialUserState.blueprints.userBlueprintsKeys;
	},
);

export const getByTag = createSelector(
	[getRawByTag],
	rawByTag => mapValues(rawByTag, ({data}) => ({data})),
);

export const getBlueprintById        = (storeState, props) => get(storeState, [
	'blueprints',
	props.id,
], initialBlueprintState);
export const getBlueprintDataById    = createSelector(
	[getBlueprintById],
	blueprint => blueprint.data,
);
export const getBlueprintLoadingById = createSelector(
	[getBlueprintById],
	blueprint => blueprint.loading,
);

export const getUserById               = (storeState, props) => get(storeState, [
	'users',
	props.id,
], initialUserState);
export const getUserBlueprints         = createSelector(
	[getUserById],
	user => user.blueprints.data,
);
export const getUserBlueprintsLoading  = createSelector(
	[getUserById],
	user => user.blueprints.loading,
);
export const getUserDisplayName        = createSelector(
	[getUserById],
	user => get(user, ['displayName', 'data', 'displayName']),
);
export const getUserDisplayNameLoading = createSelector(
	[getUserById],
	user => user.displayName.loading,
);

export const getTagsOptions = createSelector(
	[getTags],
	tags => tags.map(value => ({value, label: value})),
);

