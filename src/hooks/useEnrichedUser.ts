import { useMemo } from 'react';
import { useRawUser } from './useRawUser';
import { enrichUser } from '../utils/enrichUser';
import type { EnrichedUser } from '../schemas';

export const useEnrichedUser = (userId: string | null | undefined) =>
{
	const rawUserQuery = useRawUser(userId);

	return {
		...rawUserQuery,
		data: useMemo(() =>
		{
			if (!rawUserQuery.data) return null;
			return enrichUser(rawUserQuery.data);
		}, [rawUserQuery.data]) as EnrichedUser | null,
	};
};
