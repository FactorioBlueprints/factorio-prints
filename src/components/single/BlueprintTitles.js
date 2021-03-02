import {forbidExtraProps}     from 'airbnb-prop-types';
import axios                  from 'axios';
import PropTypes              from 'prop-types';
import React                  from 'react';
import Card                   from 'react-bootstrap/Card';
import {useQuery}             from 'react-query';
import LoadingIcon            from '../LoadingIcon';
import BlueprintContentHeader from './BlueprintContentHeader';

BlueprintTitles.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function BlueprintTitles(props)
{
	const {blueprintKey} = props;
	const queryKey       = ['blueprintTitles', blueprintKey];

	const {isLoading, isError, data, error} = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintContentTitles/${blueprintKey}`),
		{retry: false},
	);

	if (isLoading)
	{
		return (
			<Card>
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

	return <BlueprintContentHeader data={data.data} />;
}

export default BlueprintTitles;
