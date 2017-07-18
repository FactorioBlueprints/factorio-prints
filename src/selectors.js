import every from 'lodash/every';
import get from 'lodash/get';
import mapValues from 'lodash/mapValues';
import orderBy from 'lodash/orderBy';
import {createSelector} from 'reselect';
import {initialUserState} from './reducers/usersReducer';
import {initialBlueprintState} from './reducers/blueprintsReducer';

export const getUid = storeState => get(storeState, ['auth', 'user', 'uid']);
export const getDisplayName = storeState => get(storeState, ['auth', 'user', 'displayName']);
export const getPhotoURL = storeState => get(storeState, ['auth', 'user', 'photoURL']);
export const getUsers = storeState => storeState.users;
export const getBlueprintSummariesData = storeState => storeState.blueprintSummaries.data;
export const getRawByTag = storeState => storeState.byTag;
export const getTags = storeState => storeState.tags.data;
export const getLoadingTags = storeState => storeState.tags.loading;
export const getFilteredTags = storeState => storeState.filteredTags;
export const getMyFavorites = storeState => storeState.auth.myFavorites.data;
export const getTitleFilter = storeState => storeState.titleFilter;
export const getModerators = storeState => storeState.moderators.data;

export const getIsModerator = createSelector(
	[getUid, getModerators],
	(uid, moderators) => moderators[uid] === true);

export const getFilteredUser = createSelector(
	[getUid, getDisplayName],
	(uid, displayName) =>
	{
		if (uid || displayName)
		{
			return {uid, displayName};
		}
		return undefined;
	});

export const getUser = createSelector(
	[getUid, getDisplayName, getPhotoURL],
	(uid, displayName, photoURL) =>
	{
		if (uid || displayName || photoURL)
		{
			return {uid, displayName, photoURL};
		}
		return undefined;
	});

export const getMyBlueprints = createSelector(
	[getUid, getUsers],
	(uid, users) =>
	{
		if (users && uid)
		{
			return get(users, [uid, 'blueprints', 'data'], initialUserState.blueprints.data);
		}
		return initialUserState.blueprints.data;
	});

export const getByTag = createSelector(
	[getRawByTag],
	rawByTag => mapValues(rawByTag, ({data}) => ({data})));

export const getFilteredBlueprintSummaries = createSelector(
	[getBlueprintSummariesData, getTitleFilter, getLoadingTags, getFilteredTags, getByTag],
	(blueprintSummaries, titleFilter, loadingTags, filteredTags, byTag) =>
		Object.keys(blueprintSummaries)
			.filter(key => blueprintSummaries[key].title.toLowerCase().includes(titleFilter.toLowerCase()))
			.filter(key => loadingTags
				|| every(filteredTags, selectedTag => get(byTag, [selectedTag, 'data', key], false) === true))
			.reverse(),
);

export const getBlueprintById = (storeState, props) => get(storeState, ['blueprints', props.id], initialBlueprintState);
export const getBlueprintDataById = createSelector(
	[getBlueprintById],
	blueprint => blueprint.data);
export const getBlueprintLoadingById = createSelector(
	[getBlueprintById],
	blueprint => blueprint.loading);

export const getUserById = (storeState, props) => get(storeState, ['users', props.id], initialUserState);
export const getUserBlueprints = createSelector(
	[getUserById],
	user => user.blueprints.data);
export const getUserBlueprintsLoading = createSelector(
	[getUserById],
	user => user.blueprints.loading);
export const getUserDisplayName = createSelector(
	[getUserById],
	user => user.displayName.data);
export const getUserDisplayNameLoading = createSelector(
	[getUserById],
	user => user.displayName.loading);

const emptyUserBlueprints = [];
export const getUserFilteredBlueprintSummaries = createSelector(
	[getUserBlueprints, getBlueprintSummariesData, getTitleFilter, getLoadingTags, getFilteredTags, getByTag],
	(userBlueprints, blueprintSummaries, titleFilter, loadingTags, filteredTags, byTag) =>
	{
    	if (!userBlueprints)
		{
			return emptyUserBlueprints;
		}
		return Object.keys(userBlueprints)
			.filter(key => blueprintSummaries[key].title.toLowerCase().includes(titleFilter.toLowerCase()))
			.filter(key => loadingTags
				|| every(filteredTags, selectedTag => get(byTag, [selectedTag, 'data', key], false) === true))
			.reverse();
	}
);

export const getFavoriteBlueprintSummaries = createSelector(
	[getBlueprintSummariesData, getTitleFilter, getLoadingTags, getFilteredTags, getByTag],
	(blueprintSummaries, titleFilter, loadingTags, filteredTags, byTag) =>
	{
		const filtered =  Object.keys(blueprintSummaries)
			.filter(key => blueprintSummaries[key].numberOfFavorites > 0)
			.filter(key => blueprintSummaries[key].title.toLowerCase().includes(titleFilter.toLowerCase()))
			.filter(key => loadingTags
				|| every(filteredTags, selectedTag => get(byTag, [selectedTag, 'data', key], false) === true))
		return orderBy(filtered, [key => blueprintSummaries[key].numberOfFavorites], ['desc']);
	},
);

export const getMyFavoriteBlueprintSummaries = createSelector(
	[getMyFavorites, getBlueprintSummariesData, getTitleFilter, getLoadingTags, getFilteredTags, getByTag],
	(myFavorites, blueprintSummaries, titleFilter, loadingTags, filteredTags, byTag) =>
		Object.keys(myFavorites)
			.filter(key => myFavorites[key])
			.filter(key => blueprintSummaries[key].title.toLowerCase().includes(titleFilter.toLowerCase()))
			.filter(key => loadingTags
				|| every(filteredTags, selectedTag => get(byTag, [selectedTag, 'data', key], false) === true))
			.reverse(),
);

export const getTagsOptions = createSelector(
	[getTags],
	tags => tags.map(value => ({value, label: value}))
);

