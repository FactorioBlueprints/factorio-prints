import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import Image              from 'react-bootstrap/Image';

import buildImageUrl from '../../helpers/buildImageUrl';
import useBlueprint  from '../../hooks/useBlueprint';

ImgurThumbnail.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function ImgurThumbnail({blueprintKey})
{
	const result       = useBlueprint(blueprintKey);
	const {imgurImage} = result.data.data;

	if (!imgurImage)
	{
		return (
			<div className='border-warning'>
				{'Error loading imgur image.'}
			</div>
		);
	}

	const thumbnail = buildImageUrl(imgurImage.imgurId, imgurImage.imgurType, 'l');
	return (
		<a
			href={`http://imgur.com/${imgurImage.imgurId}`}
			target='_blank'
			rel='noopener noreferrer'
		>
			<Image
				thumbnail
				className='border-warning'
				src={thumbnail}
				referrerPolicy='no-referrer'
			/>
		</a>
	);
}

export default ImgurThumbnail;
