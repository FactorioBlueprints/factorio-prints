import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React              from 'react';
import Image              from 'react-bootstrap/Image';

import buildImageUrl from '../../helpers/buildImageUrl';
import useBlueprint  from '../../hooks/useBlueprint';
import LoadingIcon   from '../LoadingIcon';

ImgurThumbnail.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function ImgurThumbnail(props)
{
	const {blueprintKey} = props;

	const result = useBlueprint(blueprintKey);

	const {isLoading, isError, data} = result;
	if (isLoading)
	{
		return (
			<div className='border-warning'>
				<LoadingIcon isLoading={isLoading} />
				{' Loading...'}
			</div>
		);
	}

	if (isError || !data.data.imgurImage)
	{
		console.log({result});
		return (
			<div className='border-warning'>
				{'Error loading blueprint details.'}
			</div>
		);
	}

	const {imgurImage} = data.data;

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
