import {faLink}          from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import {Helmet}           from 'react-helmet';
import useBlueprint       from '../../hooks/useBlueprint';
import LoadingIcon        from '../LoadingIcon';
import Title              from '../Title';

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
			<a
				className='mr-1'
				target='_blank'
				rel='noopener noreferrer'
				href={`https://factorioprints.com/view/${props.blueprintKey}`}
			>
				<Helmet>
					<title>{`Factorio Prints: ${title}`}</title>
				</Helmet>
				<h1>
					<FontAwesomeIcon icon={faLink} className='text-warning' />
					{` ${title}`}
				</h1>
			</a>
	);
}

export default BlueprintTitle;
