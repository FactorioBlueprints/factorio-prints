import {faCog} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import Image from 'react-bootstrap/Image';

interface BlueprintImageProps {
	image?: {
		id?: string;
	};
	thumbnail?: string | null;
	isLoading: boolean;
}

const BlueprintImage: React.FC<BlueprintImageProps> = ({ image, thumbnail, isLoading }) =>
{
	if (isLoading)
	{
		return (
			<div className='d-flex justify-content-center'>
				<FontAwesomeIcon icon={faCog} spin size='3x' className='my-4' />
			</div>
		);
	}

	if (!image?.id || !thumbnail)
	{
		return null;
	}

	return (
		<a
			href={`http://imgur.com/${image.id}`}
			target='_blank'
			rel='noopener noreferrer'
		>
			<Image thumbnail className='border-warning' src={thumbnail} referrerPolicy='no-referrer' />
		</a>
	);
};

export default React.memo(BlueprintImage);
