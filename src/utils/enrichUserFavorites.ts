import {
	type EnrichedUserFavorites,
	type RawUserFavorites,
	validateEnrichedUserFavorites,
	validateRawUserFavorites,
} from '../schemas';

export const enrichUserFavorites = (rawUserFavorites: RawUserFavorites | null): EnrichedUserFavorites | null => {
	if (!rawUserFavorites) {
		return {
			favoriteIds: {},
			count: 0,
		};
	}

	validateRawUserFavorites(rawUserFavorites);

	// Count only true values
	const count = Object.values(rawUserFavorites).filter(Boolean).length;

	const enrichedUserFavorites: EnrichedUserFavorites = {
		favoriteIds: rawUserFavorites,
		count,
	};

	return validateEnrichedUserFavorites(enrichedUserFavorites);
};

export default enrichUserFavorites;
