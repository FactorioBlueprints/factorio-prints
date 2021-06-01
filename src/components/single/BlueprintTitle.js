import {faLink}          from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import DocumentTitle      from 'react-document-title';
import useBlueprint       from '../../hooks/useBlueprint';
import LoadingIcon        from '../LoadingIcon';

BlueprintTitle.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function BlueprintTitle(props)
{
	const {blueprintKey} = props;
	const result         = useBlueprint(blueprintKey);

	const {isLoading, isError, data} = result;
	if (isLoading)
	{
		return <>
			<LoadingIcon isLoading={isLoading} />
			{' Loading...'}
		</>;
	}

	if (isError)
	{
		console.log({result});
		return (
			<>
				{'Error loading blueprint details.'}
			</>
		);
	}

	const {title} = data.data;

	return (
		<DocumentTitle title={`Factorio Prints: ${title}`}>
			<a
				className='mr-1'
				target='_blank'
				rel='noopener noreferrer'
				href={`https://factorioprints.com/view/${props.blueprintKey}`}
			>
				<h1>
					<FontAwesomeIcon icon={faLink} className='text-warning' />
					{` ${title}`}
				</h1>
			</a>
		</DocumentTitle>
	);
}

export default BlueprintTitle;
