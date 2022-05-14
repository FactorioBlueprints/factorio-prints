import {forbidExtraProps} from 'airbnb-prop-types';

import PropTypes from 'prop-types';
import React     from 'react';
import Button    from 'react-bootstrap/Button';

FbeLink.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function FbeLink({blueprintKey})
{
	return (
		<>
			<Button
				type='button'
				href={`https://fbe.teoxoy.com/?source=https://www.factorio.school/view/${blueprintKey}`}
				target='_blank'
			>
				<img
					height={'20px'}
					width={'20px'}
					src={'/icons/fbe.png'}
					alt={'fbe'}
				/>
				{' Render in FBE'}
			</Button>
		</>
	);
}

export default FbeLink;
