import {forbidExtraProps} from 'airbnb-prop-types';

import axios      from 'axios';
import PropTypes  from 'prop-types';
import React      from 'react';
import Card       from 'react-bootstrap/Card';
import {useQuery} from 'react-query';

import ItemHistogram  from './ItemHistogram';
import UpgradePlanner from './UpgradePlanner';

RequirementsHistogram.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function RequirementsHistogram(props)
{
	const {blueprintKey} = props;
	const queryKey       = ['blueprintItems', blueprintKey];

	const {isSuccess, isError, data, error} = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintItems/${blueprintKey}`),
		{retry: false},
	);

	if (isError)
	{
		const {message} = error.response.data;
		return (
			<Card>
				<Card.Header>{'Entities'}</Card.Header>
				<Card.Body>{`Error loading data: ${message}`}</Card.Body>
			</Card>
		);
	}

	if (!isSuccess)
	{
		return <></>;
	}

	const {blueprint, upgrade_planner: upgradePlanner} = data.data;

	return (
		<>
			{blueprint && <ItemHistogram title='Entities' items={blueprint.entities} />}
			{blueprint && <ItemHistogram title='Items' items={blueprint.items} />}
			{blueprint && <ItemHistogram title='Recipes' items={blueprint.recipes} />}
			{upgradePlanner && <UpgradePlanner mappers={upgradePlanner.mappers} />}
		</>
	);
}

export default RequirementsHistogram;
