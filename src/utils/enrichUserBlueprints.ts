import {
	validateRawUserBlueprints,
	validateEnrichedUserBlueprints,
	type RawUserBlueprints,
	type EnrichedUserBlueprints,
} from '../schemas';

export const enrichUserBlueprints = (rawUserBlueprints: RawUserBlueprints | null): EnrichedUserBlueprints | null =>
{
	if (!rawUserBlueprints)
	{
		return {
			blueprintIds: {},
			count       : 0,
		};
	}

	validateRawUserBlueprints(rawUserBlueprints);

	// Count only true values
	const count = Object.values(rawUserBlueprints).filter(Boolean).length;

	const enrichedUserBlueprints: EnrichedUserBlueprints = {
		blueprintIds: rawUserBlueprints,
		count,
	};

	return validateEnrichedUserBlueprints(enrichedUserBlueprints);
};

export default enrichUserBlueprints;
