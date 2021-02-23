import {faCog}           from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import {forbidExtraProps} from 'airbnb-prop-types';

import axios      from 'axios';
import PropTypes  from 'prop-types';
import React      from 'react';
import {useQuery} from 'react-query';

BlueprintVersion.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function BlueprintVersion(props)
{
	const {blueprintKey}                        = props;
	const queryKey                              = ['blueprintTitles', blueprintKey];
	const {isSuccess, isLoading, isError, data} = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintContentTitles/${blueprintKey}`),
		{retry: false},
	);

	if (isLoading)
	{
		return <FontAwesomeIcon icon={faCog} spin />;
	}

	if (isError)
	{
		return 'Error';
	}

	return getVersion(data.data);
}

function getVersion(data)
{
	if (data.blueprint_book)
	{
		return getBlueprintVersion(data.blueprint_book);
	}
	else if (data.blueprint)
	{
		return getBlueprintVersion(data.blueprint);
	}
	else if (data.deconstruction_planner)
	{
		return getBlueprintVersion(data.deconstruction_planner);
	}
	else if (data.upgrade_planner)
	{
		return getBlueprintVersion(data.upgrade_planner);
	}
	else
	{
		throw new Error(JSON.stringify(data, null, 2));
	}
}

function getBlueprintVersion(data)
{
	return data.versionString;
}

export default BlueprintVersion;
