import {faHeart}          from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {getAuth}          from 'firebase/auth';
import React              from 'react';
import Card               from 'react-bootstrap/Card';
import OverlayTrigger     from 'react-bootstrap/OverlayTrigger';
import Tooltip            from 'react-bootstrap/Tooltip';
import {useAuthState}     from 'react-firebase-hooks/auth';
import {Link}             from '@tanstack/react-router';
import {app}              from '../base';
import buildImageUrl                         from '../helpers/buildImageUrl';
import useToggleFavoriteMutation             from '../hooks/useToggleFavoriteMutation';
import {useUserBlueprints, useUserFavorites} from '../hooks/useUser';
import {EnrichedBlueprintSummary, validateEnrichedBlueprintSummary} from '../schemas';

interface BlueprintThumbnailProps {
	blueprintSummary: EnrichedBlueprintSummary;
}

const BlueprintThumbnail: React.FC<BlueprintThumbnailProps> = ({blueprintSummary}) =>
{
	const [user] = useAuthState(getAuth(app));
	const {
		data: userFavoritesData,
		isSuccess: userFavoritesIsSuccess,
	} = useUserFavorites(user?.uid);
	const {
		data: userBlueprintsData,
		isSuccess: userBlueprintsIsSuccess,
	} = useUserBlueprints(user?.uid);
	const favoriteBlueprintMutation = useToggleFavoriteMutation();

	try
	{
		validateEnrichedBlueprintSummary(blueprintSummary);
	}
	catch (error)
	{
		console.error('Invalid blueprint summary in BlueprintThumbnail:', error, blueprintSummary);
		return (
			<Card className='blueprint-thumbnail col-auto' style={{width: '11rem', backgroundColor: '#1c1e22'}}>
				<Card.Img variant='top' src='/icons/entity-unknown.png' />
				<p className='truncate p-1 text-danger'>Error: Invalid blueprint data</p>
			</Card>
		);
	}

	const {key, title, imgurId, imgurType, numberOfFavorites} = blueprintSummary;

	const isFavorite = userFavoritesIsSuccess && userFavoritesData[key] === true;
	const isMine = userBlueprintsIsSuccess && userBlueprintsData[key] === true;

	const tooltip  = (
		<Tooltip>
			{title}
		</Tooltip>
	);

	let imageUrl;
	try
	{
		if (!imgurId || !imgurType)
		{
			console.error('Missing imgurId or imgurType in blueprintSummary:', {
				key,
				title,
				imgurId,
				imgurType,
			});
			imageUrl = '/icons/entity-unknown.png';
		}
		else
		{
			imageUrl = buildImageUrl(imgurId, imgurType, 'b');
		}
	}
	catch (error)
	{
		console.error('Error building image URL:', error, {
			key,
			title,
			imgurId,
			imgurType,
		});
		imageUrl = '/icons/entity-unknown.png';
	}

	const mineStyle     = isMine ? 'text-warning' : 'text-default';
	const favoriteStyle = isFavorite ? 'text-warning' : 'text-default';

	return (
		<Card className='blueprint-thumbnail col-auto' style={{width: '11rem', backgroundColor: '#1c1e22'}}>
			<Link to='/view/$blueprintId' params={{ blueprintId: key }} from='/'>
				<Card.Img
					variant='top'
					src={imageUrl}
					referrerPolicy='no-referrer'
					onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) =>
					{
						const target = e.target as HTMLImageElement;
						console.log('Image load error in BlueprintThumbnail:', target.src);
						try
						{
							target.onerror = null;
							target.src = '/icons/entity-unknown.png';
						}
						catch (err)
						{
							console.error('Error in BlueprintThumbnail image error handler:', err);
						}
					}}
				/>
			</Link>
			<p className='truncate p-1'>
				<span className='mr-1'>
					{`${numberOfFavorites}`}
					{' '}
					<span className='sr-only'>
						favorites
					</span>
				</span>
				{/* TODO 2025-04-10: Extract this as a component, the FavoriteIcon */}
				<span
					className={`${favoriteStyle} ${(!user || favoriteBlueprintMutation.isPending) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
					onClick={() =>
					{
						if (!user || favoriteBlueprintMutation.isPending)
						{
							return;
						}
						favoriteBlueprintMutation.mutate({
							blueprintId      : key,
							userId           : user.uid,
							isFavorite,
							numberOfFavorites: numberOfFavorites || 0,
						});
					}}
					role='button'
					tabIndex={0}
					onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) =>
					{
						// Allow triggering with Enter or Space key for accessibility
						if (!user || favoriteBlueprintMutation.isPending)
						{
							return;
						}
						if (e.key === 'Enter' || e.key === ' ')
						{
							// Prevent space bar scrolling page
							e.preventDefault();
							favoriteBlueprintMutation.mutate({
								blueprintId      : key,
								userId           : user.uid,
								isFavorite,
								numberOfFavorites: numberOfFavorites || 0,
							});
						}
					}}
					aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
					aria-disabled={!user || favoriteBlueprintMutation.isPending}
				>
					<FontAwesomeIcon icon={faHeart} className='text-error' />
				</span>
				{'  '}
				<OverlayTrigger placement='bottom' overlay={tooltip}>
					<Link to='/view/$blueprintId' params={{ blueprintId: key }} from='/'>
						<span className={mineStyle}>
							{title}
						</span>
					</Link>
				</OverlayTrigger>
			</p>
		</Card>
	);
};


export default BlueprintThumbnail;
