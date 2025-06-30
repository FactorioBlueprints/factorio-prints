import {forbidExtraProps}     from '../../utils/propTypes';
import axios                  from 'axios';
import PropTypes              from 'prop-types';
import React                  from 'react';
import Card                   from 'react-bootstrap/Card';
import {useQuery}             from '@tanstack/react-query';
import LoadingIcon            from '../LoadingIcon';
import BlueprintContentHeader from './BlueprintContentHeader';

BlueprintTitles.propTypes = forbidExtraProps({
	blueprintKey      : PropTypes.string.isRequired,
	blueprintStringSha: PropTypes.string,
});

function BlueprintTitles({blueprintKey, blueprintStringSha})
{
	const queryKey = ['blueprintTitles', blueprintStringSha];

	const {isPending, isError, isSuccess, data, error} = useQuery({
		queryKey,
		queryFn: () => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintContentTitlesBySha/${blueprintStringSha}`),
		enabled             : blueprintStringSha !== undefined,
		retry               : false,
		gcTime              : Infinity,
		staleTime           : Infinity,
		refetchOnMount      : false,
		refetchOnWindowFocus: false,
		refetchOnReconnect  : false,
	});

	if (isPending)
	{
		// TODO 2023-03-08: implement placeholder
		return (
			<Card>
				<LoadingIcon isPending={isPending} />
				{' Loading blueprint titles'}
			</Card>
		);
	}

	if (isError)
	{
		return <Card>{`Error loading data: ${error}`}</Card>;
	}

	if (isSuccess)
	{
		return <BlueprintContentHeader
			data={data.data}
			blueprintKey={blueprintKey}
			blueprintStringSha={blueprintStringSha}
		/>;
	}

	return null;
}

export default BlueprintTitles;
