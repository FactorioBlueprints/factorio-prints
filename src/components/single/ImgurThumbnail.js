import {forbidExtraProps} from 'airbnb-prop-types';

import axios      from 'axios';
import PropTypes  from 'prop-types';
import React      from 'react';
import Image      from 'react-bootstrap/Image';
import {useQuery} from 'react-query';

import buildImageUrl from '../../helpers/buildImageUrl';
import LoadingIcon   from '../LoadingIcon';

ImgurThumbnail.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function ImgurThumbnail(props)
{
	const {blueprintKey} = props;

	const queryKey = ['blueprintDetails', blueprintKey];

	const result = useQuery(
		queryKey,
		() => axios.get(`${process.env.REACT_APP_REST_URL}/api/blueprintDetails/${blueprintKey}`),
	);

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
