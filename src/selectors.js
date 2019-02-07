import every                   from 'lodash/every';
import get                     from 'lodash/get';
import mapValues               from 'lodash/mapValues';
import sortBy                  from 'lodash/sortBy';
import values                  from 'lodash/values';
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
export const getBlueprintAllFavoritesData    = storeState => storeState.blueprintAllFavorites.data;
export const getBlueprintAllFavoritesLoading = storeState => storeState.blueprintAllFavorites.loading;
export const getRawByTag                     = storeState => storeState.byTag;
export const getTags                         = storeState => storeState.tags.data;
export const getLoadingTags                  = storeState => storeState.tags.loading;
export const getFilteredTags                 = storeState => storeState.filteredTags;
export const getMyFavoritesKeys              = storeState => storeState.auth.myFavorites.myFavoritesKeys;
export const getMyFavoritesSummaries         = storeState => storeState.auth.myFavorites.myFavoritesSummaries;
export const getTitleFilter                  = storeState => storeState.titleFilter;
export const getModerators                   = storeState => storeState.moderators.data;

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
	user => user.blueprints.userBlueprints,
);
export const getUserBlueprintsLoading  = createSelector(
	[getUserById],
	user => user.blueprints.loading,
);
export const getUserDisplayName        = createSelector(
	[getUserById],
	user => user.displayName.data,
);
export const getUserDisplayNameLoading = createSelector(
	[getUserById],
	user => user.displayName.loading,
);

export const getUserFilteredBlueprintSummaries = createSelector(
	[
		getUserBlueprints,
		getTitleFilter,
		getLoadingTags,
		getFilteredTags,
		getByTag,
	],
	(userBlueprints, titleFilter, loadingTags, filteredTags, byTag) =>
	{
		if (!userBlueprints)
		{
			return undefined;
		}
		return userBlueprints
			.filter(blueprintSummary => blueprintSummary.title.toLowerCase().includes(titleFilter.toLowerCase()))
			.filter(blueprintSummary => loadingTags
				|| every(filteredTags, selectedTag => get(byTag, [selectedTag, 'data', blueprintSummary.key], false) === true))
			.reverse();
	},
);

export const getBlueprintSummaries = createSelector(
	[
		getBlueprintSummariesData,
		getTitleFilter,
		getLoadingTags,
		getFilteredTags,
		getByTag,
	],
	(blueprintSummaries, titleFilter, loadingTags, filteredTags, byTag) => blueprintSummaries
		.filter(blueprintSummary => blueprintSummary.title.toLowerCase().includes(titleFilter.toLowerCase()))
		.filter(blueprintSummary => loadingTags
			|| every(filteredTags, selectedTag => get(byTag, [selectedTag, 'data', blueprintSummary.key], false) === true)),
);

export const getFavoriteBlueprintSummaries = createSelector(
	[
		getBlueprintAllFavoritesData,
		getTitleFilter,
		getLoadingTags,
		getFilteredTags,
		getByTag,
	],
	(blueprintSummaries, titleFilter, loadingTags, filteredTags, byTag) => blueprintSummaries
		.filter(blueprintSummary => blueprintSummary.title.toLowerCase().includes(titleFilter.toLowerCase()))
		.filter(blueprintSummary => loadingTags
			|| every(filteredTags, selectedTag => get(byTag, [selectedTag, 'data', blueprintSummary.key], false) === true)),
);

const myFavoriteSummariesInputs = [
	getMyFavoritesSummaries,
	getTitleFilter,
	getLoadingTags,
	getFilteredTags,
	getByTag,
];

const myFavoriteSummariesFilter = (myFavorites, titleFilter, loadingTags, filteredTags, byTag) =>
	sortBy(values(myFavorites), each => each.key)
		.filter(blueprintSummary => blueprintSummary.title !== '')
		.filter(blueprintSummary => blueprintSummary.title.toLowerCase().includes(titleFilter.toLowerCase()))
		.filter(blueprintSummary => loadingTags
			|| every(filteredTags, selectedTag => get(byTag, [selectedTag, 'data', blueprintSummary.key], false) === true))
		.reverse();

export const getMyFavoriteBlueprintSummaries = createSelector(
	myFavoriteSummariesInputs,
	myFavoriteSummariesFilter,
);

export const getTagsOptions = createSelector(
	[getTags],
	tags => tags.map(value => ({value, label: value})),
);

