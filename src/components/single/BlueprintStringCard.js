import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import Card               from 'react-bootstrap/Card';
import useBlueprintString from '../../hooks/useBlueprintString';
import LoadingIcon        from '../LoadingIcon';

BlueprintStringCard.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
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
			{data.data}
		</div>
	);
}

function BlueprintStringCard({blueprintKey})
{
	const result = useBlueprintString(blueprintKey);
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
