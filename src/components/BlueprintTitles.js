import {faCog}                from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import axios                  from 'axios';
import PropTypes              from 'prop-types';
import React                  from 'react';
import Card                   from 'react-bootstrap/Card';
import {useQuery}             from 'react-query';
import BlueprintContentHeader from './BlueprintContentHeader';

BlueprintTitles.propTypes = {
	blueprintKey: PropTypes.string.isRequired,
};

function BlueprintTitles(props)
{
	const {blueprintKey}     = props;
	const queryKey                              = ['blueprintTitles', blueprintKey];
	const {isSuccess, isLoading, isError, data} = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintContentTitles/${blueprintKey}`),
	);

	if (isLoading)
	{
		return (
			<Card>
				<FontAwesomeIcon icon={faCog} spin />
				{' Loading blueprint titles'}
			</Card>
		);
	}

	if (isError)
	{
		return <Card>{'Error loading data'}</Card>;
	}

	return <BlueprintContentHeader data={data.data} />;
}

export default BlueprintTitles;
