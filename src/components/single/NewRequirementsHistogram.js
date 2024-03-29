import {useQuery}         from '@tanstack/react-query';
import {forbidExtraProps} from 'airbnb-prop-types';

import axios            from 'axios';
import PropTypes        from 'prop-types';
import React            from 'react';
import Card             from 'react-bootstrap/Card';
import NewItemHistogram from './NewItemHistogram';

NewRequirementsHistogram.propTypes = forbidExtraProps({
	blueprintStringSha: PropTypes.string,
});

function NewRequirementsHistogram({blueprintStringSha})
{
	const queryKey = ['blueprintTable', blueprintStringSha];

	const result                            = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintTableBySha/${blueprintStringSha}`),
		{
			enabled             : blueprintStringSha !== undefined,
			retry               : false,
			cacheTime           : 'Infinity',
			staleTime           : 'Infinity',
			refetchOnMount      : false,
			refetchOnWindowFocus: false,
			refetchOnReconnect  : false,
		},
	);
	const {isError, isSuccess, data, error} = result;

	if (isError)
	{
		console.log({result})
		return (
			<Card>
				<Card.Header>{'Entities'}</Card.Header>
				<Card.Body>{`Error loading data: ${error}`}</Card.Body>
			</Card>
		);
	}

	if (!isSuccess)
	{
		return <></>;
	}

	return (
		<>
			<NewItemHistogram title='Entities' type='entity' items={data.data.entities} />
			<NewItemHistogram title='Recipes' type='recipe' items={data.data.recipes} />
			{/*{upgradePlanner && <UpgradePlanner mappers={upgradePlanner.mappers} />}*/}
		</>
	);
}

export default NewRequirementsHistogram;
