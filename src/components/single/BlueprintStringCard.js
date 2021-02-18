import {faCog}            from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import PropTypes          from 'prop-types';
import React              from 'react';
import Card               from 'react-bootstrap/Card';
import useBlueprintString from '../../hooks/useBlueprintString';

BlueprintStringCard.propTypes = {
	blueprintKey: PropTypes.string.isRequired,
};

const getBody = function (result)
{
	const {isSuccess, isLoading, isError, data} = result;

	if (isLoading)
	{
		return (<>
			<FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />
			{' Loading...'}
		</>);
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
};

function BlueprintStringCard(props)
{
	const {blueprintKey} = props;
	const result         = useBlueprintString(blueprintKey);
	const body           = getBody(result);

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
