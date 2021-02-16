import {faCog}                from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import axios                  from 'axios';
import PropTypes              from 'prop-types';
import React                  from 'react';
import Jumbotron              from 'react-bootstrap/Jumbotron';
import {useQuery}             from 'react-query';
import BlueprintContentHeader from './BlueprintContentHeader';

BlueprintTitles.propTypes = {
	match: PropTypes.shape({
		params: PropTypes.shape({
			blueprintKey: PropTypes.string.isRequired,
		}),
	}).isRequired,
};

function BlueprintTitles(props)
{
	const {match: {params: {blueprintKey}}}     = props;
	const queryKey                              = ['blueprintTitles', blueprintKey];
	const {isSuccess, isLoading, isError, data} = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintContentTitles/${blueprintKey}`),
	);

	if (isLoading)
	{
		return (<Jumbotron>
			<h1 className='display-4'>
				<FontAwesomeIcon icon={faCog} spin />
				{' Loading data'}
			</h1>
		</Jumbotron>);
	}

	if (isError)
	{
		return (
			<div>
				Error loading data
			</div>
		);
	}

	return (
		<div>
			<h1>Blueprint data</h1>
			<BlueprintContentHeader data={data.data} />
		</div>
	);
}

export default BlueprintTitles;
