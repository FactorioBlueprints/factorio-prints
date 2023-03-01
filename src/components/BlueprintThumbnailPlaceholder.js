import {faHeart}          from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';

import React from 'react';

import Card        from 'react-bootstrap/Card';
import Placeholder from 'react-bootstrap/Placeholder';

import BlueprintSummaryProjection from '../propTypes/BlueprintSummaryProjection';

BlueprintThumbnailPlaceholder.propTypes = forbidExtraProps({
	blueprintSummary: BlueprintSummaryProjection,
});

function BlueprintThumbnailPlaceholder()
{
	return (
		<Card className='blueprint-thumbnail col-auto' style={{width: '11rem', backgroundColor: '#1c1e22'}}>
			<Card.Img variant='top' src="holder.js/100px180?font=Tillium Web&text=Loading&bg=3a3f44&fg=aaaaaa" />
			<Placeholder as={Card.Text} animation='glow' variant="light" className='truncate p-1'>
				<span className='mr-1'>0 <span className='sr-only'>favorites</span></span>
				<span className='text-default'>
						<FontAwesomeIcon icon={faHeart} className='text-error' />
					</span>
				{'  '}
				<Placeholder xs={3} /> <Placeholder xs={2} /> <Placeholder xs={3} />
			</Placeholder>

		</Card>
	);
}

export default BlueprintThumbnailPlaceholder;
