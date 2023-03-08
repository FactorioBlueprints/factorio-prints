import {forbidExtraProps}     from 'airbnb-prop-types';
import axios                  from 'axios';
import PropTypes              from 'prop-types';
import React                  from 'react';
import Card                   from 'react-bootstrap/Card';
import {useQuery}             from '@tanstack/react-query';
import LoadingIcon            from '../LoadingIcon';
import BlueprintContentHeader from './BlueprintContentHeader';

BlueprintTitles.propTypes = forbidExtraProps({
	blueprintStringSha: PropTypes.string,
});

function BlueprintTitles({blueprintStringSha})
{
	const queryKey = ['blueprintTitles', blueprintStringSha];

	const {isLoading, isError, isSuccess, data, error} = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintContentTitlesBySha/${blueprintStringSha}`),
		{
			enabled  : blueprintStringSha !== undefined,
			retry    : false,
			cacheTime: 'Infinity',
			staleTime: 'Infinity',
			refetchOnMount: false,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
		},
	);

	if (isLoading)
	{
		return (
			<Card>
				// TODO 2023-03-08: implement placeholder
				<LoadingIcon isLoading={isLoading} />
				{' Loading blueprint titles'}
			</Card>
		);
	}

	if (isError)
	{
		const {message} = error.response.data;
		return <Card>{`Error loading data: ${message}`}</Card>;
	}

	if (isSuccess)
	{
		return <BlueprintContentHeader data={data.data} />;
	}

	return null;
}

export default BlueprintTitles;
