import {useQuery} from '@tanstack/react-query';
import {forbidExtraProps} from 'airbnb-prop-types';

import axios from 'axios';
import PropTypes from 'prop-types';
import React from 'react';
import ReactQueryStatus from '../search/ReactQueryStatus';

BlueprintVersion.propTypes = forbidExtraProps({
	blueprintStringSha: PropTypes.string,
});

function BlueprintVersion({blueprintStringSha}) {
	const queryKey = ['blueprintTitles', blueprintStringSha];

	const result = useQuery({
		queryKey,
		queryFn: () =>
			axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintContentTitlesBySha/${blueprintStringSha}`),
		enabled: blueprintStringSha !== undefined,
		retry: false,
		gcTime: 'Infinity',
		staleTime: 'Infinity',
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

function getVersion(data) {
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

function getBlueprintVersion(data) {
	return data.versionString;
}

export default BlueprintVersion;
