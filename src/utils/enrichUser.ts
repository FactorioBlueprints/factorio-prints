import {validateRawUser, validateEnrichedUser, type RawUser, type EnrichedUser} from '../schemas';

export const enrichUser = (rawUser: RawUser | null): EnrichedUser | null => {
	if (!rawUser) return null;

	validateRawUser(rawUser);

	// Count favorites (only true values)
	const favoritesCount = rawUser.favorites ? Object.values(rawUser.favorites).filter(Boolean).length : 0;

	// Count blueprints (only true values)
	const blueprintsCount = rawUser.blueprints ? Object.values(rawUser.blueprints).filter(Boolean).length : 0;

	const enrichedUser: EnrichedUser = {
		...rawUser,
		favoritesCount,
		blueprintsCount,
	};

	return validateEnrichedUser(enrichedUser);
};

export default enrichUser;
