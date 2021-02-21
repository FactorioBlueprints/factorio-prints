import axios          from 'axios';
import PropTypes      from 'prop-types';
import React          from 'react';
import {useQuery}     from 'react-query';
import ItemHistogram  from './ItemHistogram';
import UpgradePlanner from './UpgradePlanner';

RequirementsHistogram.propTypes = {
	blueprintKey: PropTypes.string.isRequired,
};

function RequirementsHistogram(props)
{
	const {blueprintKey} = props;

	const queryKey                              = ['blueprintItems', blueprintKey];
	const {isSuccess, isLoading, isError, data} = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintItems/${blueprintKey}`),
	);

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
