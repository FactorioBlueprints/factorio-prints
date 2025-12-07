import {faLink}          from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import React              from 'react';
import {Helmet}           from 'react-helmet';
import useBlueprint       from '../../hooks/useBlueprint';

interface BlueprintTitleProps {
	blueprintKey: string;
}

function BlueprintTitle({blueprintKey}: BlueprintTitleProps)
{
	const result  = useBlueprint(blueprintKey);
	const {title} = result.data!.data;

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
