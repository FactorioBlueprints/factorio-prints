import {useQuery} from '@tanstack/react-query';
import axios from 'axios';
import ReactQueryStatus from '../search/ReactQueryStatus';

interface BlueprintVersionProps {
	blueprintStringSha?: string;
}

interface BlueprintData {
	versionString?: string;
	blueprint_book?: BlueprintData;
	blueprint?: BlueprintData;
	deconstruction_planner?: BlueprintData;
	upgrade_planner?: BlueprintData;
}

function BlueprintVersion({blueprintStringSha}: BlueprintVersionProps) {
	const queryKey = ['blueprintTitles', blueprintStringSha];

	const result = useQuery({
		queryKey,
		queryFn: () =>
			axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintContentTitlesBySha/${blueprintStringSha}`),
		enabled: blueprintStringSha !== undefined,
		retry: false,
		gcTime: Infinity,
		staleTime: Infinity,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	const {data, isSuccess} = result;

	return (
		<>
			<ReactQueryStatus {...result} />
			{isSuccess && getVersion(data.data)}
		</>
	);
}

function getVersion(data: BlueprintData): string | undefined {
	if (data.blueprint_book) {
		return getBlueprintVersion(data.blueprint_book);
	} else if (data.blueprint) {
		return getBlueprintVersion(data.blueprint);
	} else if (data.deconstruction_planner) {
		return getBlueprintVersion(data.deconstruction_planner);
	} else if (data.upgrade_planner) {
		return getBlueprintVersion(data.upgrade_planner);
	} else {
		throw new Error(JSON.stringify(data, null, 2));
	}
}

function getBlueprintVersion(data: BlueprintData): string | undefined {
	return data.versionString;
}

export default BlueprintVersion;
