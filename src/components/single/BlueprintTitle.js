import {faLink}          from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import {forbidExtraProps} from '../../utils/propTypes';
import PropTypes          from 'prop-types';
import React              from 'react';
import {Helmet}           from 'react-helmet';
import useBlueprint       from '../../hooks/useBlueprint';

BlueprintTitle.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function BlueprintTitle({blueprintKey})
{
	const result  = useBlueprint(blueprintKey);
	const {title} = result.data.data;

	return (
		<a
			className='mr-1'
			href={`https://factorioprints.com/view/${blueprintKey}`}
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
