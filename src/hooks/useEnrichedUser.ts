import {useMemo} from 'react';
import type {EnrichedUser} from '../schemas';
import {enrichUser} from '../utils/enrichUser';
import {useRawUser} from './useRawUser';

export const useEnrichedUser = (userId: string | null | undefined) => {
	const rawUserQuery = useRawUser(userId);

	return {
		...rawUserQuery,
		data: useMemo(() => {
			if (!rawUserQuery.data) return null;
			return enrichUser(rawUserQuery.data);
		}, [rawUserQuery.data]) as EnrichedUser | null,
	};
};
