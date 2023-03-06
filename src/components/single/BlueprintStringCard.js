import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import Card               from 'react-bootstrap/Card';

import useBlueprintStringSha from '../../hooks/useBlueprintStringSha';
import LoadingIcon           from '../LoadingIcon';

BlueprintStringCard.propTypes = forbidExtraProps({
	blueprintStringSha: PropTypes.string,
});

function getBody(result)
{
	const {isLoading, isError, data} = result;

	if (isLoading)
	{
		return (
			<>
				<LoadingIcon isLoading={isLoading} />
				{' Loading...'}
			</>
		);
	}

	if (isError)
	{
		console.log({result});
		return (
			<>
				{'Error loading blueprint string.'}
			</>
		);
	}

	return (
		<div className='blueprintString'>
			{data.data?.blueprintString}
		</div>
	);
}

function BlueprintStringCard({blueprintStringSha})
{
	const result = useBlueprintStringSha(blueprintStringSha);
	const body   = getBody(result);

	return (
		<Card>
			<Card.Header>
				Blueprint String
			</Card.Header>
			<Card.Body>
				{body}
			</Card.Body>
		</Card>
	);
}

export default BlueprintStringCard;
