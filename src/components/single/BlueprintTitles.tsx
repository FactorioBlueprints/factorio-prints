import {useQuery} from '@tanstack/react-query';
import Card from 'react-bootstrap/Card';
import apiClient from '../../api/apiClient';
import LoadingIcon from '../LoadingIcon';
import BlueprintContentHeader from './BlueprintContentHeader';

interface BlueprintTitlesProps {
	blueprintKey: string;
	blueprintStringSha?: string;
}

function BlueprintTitles({blueprintKey, blueprintStringSha}: BlueprintTitlesProps) {
	const queryKey = ['blueprintTitles', blueprintStringSha];

	const {isPending, isError, isSuccess, data, error} = useQuery({
		queryKey,
		queryFn: () => apiClient.get(`/api/blueprintContentTitlesBySha/${blueprintStringSha}`),
		enabled: blueprintStringSha !== undefined,
		retry: false,
		gcTime: Infinity,
		staleTime: Infinity,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	if (isPending) {
		return (
			<Card>
				<LoadingIcon isPending={isPending} />
				{' Loading blueprint titles'}
			</Card>
		);
	}

	if (isError) {
		return <Card>{`Error loading data: ${error}`}</Card>;
	}

	if (isSuccess && blueprintStringSha) {
		return (
			<BlueprintContentHeader
				data={data.data}
				blueprintKey={blueprintKey}
				blueprintStringSha={blueprintStringSha}
			/>
		);
	}

	return null;
}

export default BlueprintTitles;
