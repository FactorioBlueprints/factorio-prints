import {faCheck, faHeart, faPlusSquare, faXmark} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Link} from '@tanstack/react-router';
import {getAuth} from 'firebase/auth';
import type React from 'react';
import {useState} from 'react';
import Card from 'react-bootstrap/Card';
import Tooltip from 'react-bootstrap/Tooltip';
import {useAuthState} from 'react-firebase-hooks/auth';
import {app} from '../base';
import buildImageUrl from '../helpers/buildImageUrl';
import useToggleCollectionMutation from '../hooks/useToggleCollectionMutation';
import useToggleFavoriteMutation from '../hooks/useToggleFavoriteMutation';
import {useUserBlueprints, useUserCollection, useUserFavorites} from '../hooks/useUser';
import {type EnrichedBlueprintSummary, validateEnrichedBlueprintSummary} from '../schemas';
import {RichText} from './core/text/RichText';
import SafeOverlayTrigger from './SafeOverlayTrigger';

interface BlueprintThumbnailProps {
	blueprintSummary: EnrichedBlueprintSummary;
}

const BlueprintThumbnail: React.FC<BlueprintThumbnailProps> = ({blueprintSummary}) => {
	const [user] = useAuthState(getAuth(app));
	const [isCollectionHovering, setIsCollectionHovering] = useState(false);
	const {data: userFavoritesData, isSuccess: userFavoritesIsSuccess} = useUserFavorites(user?.uid);
	const {data: userCollectionData, isSuccess: userCollectionIsSuccess} = useUserCollection(user?.uid);
	const {data: userBlueprintsData, isSuccess: userBlueprintsIsSuccess} = useUserBlueprints(user?.uid);
	const favoriteBlueprintMutation = useToggleFavoriteMutation();
	const collectionMutation = useToggleCollectionMutation();

	try {
		validateEnrichedBlueprintSummary(blueprintSummary);
	} catch {
		return (
			<Card
				className="blueprint-thumbnail col-auto"
				style={{width: '11rem', backgroundColor: '#1c1e22'}}
			>
				<Card.Img
					variant="top"
					src="/icons/entity-unknown.png"
				/>
				<p className="truncate p-1 text-danger">Error: Invalid blueprint data</p>
			</Card>
		);
	}

	const {key, title, imgurId, imgurType, numberOfFavorites} = blueprintSummary;

	const isFavorite = userFavoritesIsSuccess && userFavoritesData[key] === true;
	const isInCollection = userCollectionIsSuccess && userCollectionData[key] === true;
	const isMine = userBlueprintsIsSuccess && userBlueprintsData[key] === true;

	const tooltip = (
		<Tooltip>
			<RichText
				text={title}
				inline
			/>
		</Tooltip>
	);

	let imageUrl;
	try {
		if (!imgurId || !imgurType) {
			imageUrl = '/icons/entity-unknown.png';
		} else {
			imageUrl = buildImageUrl(imgurId, imgurType, 'b');
		}
	} catch {
		imageUrl = '/icons/entity-unknown.png';
	}

	const mineStyle = isMine ? 'text-warning' : 'text-default';
	const favoriteStyle = isFavorite ? 'text-warning' : 'text-default';
	const collectionStyle = isInCollection ? 'text-warning' : 'text-default';
	const collectionIcon = isInCollection ? (isCollectionHovering ? faXmark : faCheck) : faPlusSquare;

	return (
		<Card
			className="blueprint-thumbnail col-auto"
			style={{width: '11rem', backgroundColor: '#1c1e22'}}
		>
			<Link
				to="/view/$blueprintId"
				params={{blueprintId: key}}
				from="/"
				preload={false}
			>
				<Card.Img
					variant="top"
					src={imageUrl}
					referrerPolicy="no-referrer"
					onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
						const target = e.target as HTMLImageElement;
						try {
							target.onerror = null;
							target.src = '/icons/entity-unknown.png';
						} catch {}
					}}
				/>
			</Link>
			<p className="truncate p-1">
				<span className="mr-1">
					{`${numberOfFavorites}`} <span className="sr-only">favorites</span>
				</span>
				{/* TODO 2025-04-10: Extract this as a component, the FavoriteIcon */}
				<span
					className={`${favoriteStyle} ${!user || favoriteBlueprintMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
					onClick={() => {
						if (!user || favoriteBlueprintMutation.isPending) {
							return;
						}
						favoriteBlueprintMutation.mutate({
							blueprintId: key,
							userId: user.uid,
							isFavorite,
							numberOfFavorites: numberOfFavorites || 0,
						});
					}}
					role="button"
					tabIndex={0}
					onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
						// Allow triggering with Enter or Space key for accessibility
						if (!user || favoriteBlueprintMutation.isPending) {
							return;
						}
						if (e.key === 'Enter' || e.key === ' ') {
							// Prevent space bar scrolling page
							e.preventDefault();
							favoriteBlueprintMutation.mutate({
								blueprintId: key,
								userId: user.uid,
								isFavorite,
								numberOfFavorites: numberOfFavorites || 0,
							});
						}
					}}
					aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
					aria-disabled={!user || favoriteBlueprintMutation.isPending}
				>
					<FontAwesomeIcon
						icon={faHeart}
						className="text-error"
					/>
				</span>
				{'  '}
				<span
					className={`${collectionStyle} ${!user || collectionMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
					onMouseEnter={() => setIsCollectionHovering(true)}
					onMouseLeave={() => setIsCollectionHovering(false)}
					onClick={() => {
						if (!user || collectionMutation.isPending) {
							return;
						}

						collectionMutation.mutate({
							blueprintId: key,
							userId: user.uid,
							isInCollection,
						});
					}}
					role="button"
					tabIndex={0}
					onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => {
						if (!user || collectionMutation.isPending) {
							return;
						}
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							collectionMutation.mutate({
								blueprintId: key,
								userId: user.uid,
								isInCollection,
							});
						}
					}}
					onFocus={() => setIsCollectionHovering(true)}
					onBlur={() => setIsCollectionHovering(false)}
					aria-label={isInCollection ? 'Remove from collection' : 'Add to collection'}
					aria-disabled={!user || collectionMutation.isPending}
				>
					<FontAwesomeIcon
						icon={collectionIcon}
						className="text-error"
					/>
				</span>
				{'  '}
				<SafeOverlayTrigger
					placement="bottom"
					overlay={tooltip}
				>
					<Link
						to="/view/$blueprintId"
						params={{blueprintId: key}}
						from="/"
						preload={false}
					>
						<span className={mineStyle}>
							<RichText
								text={title}
								inline
							/>
						</span>
					</Link>
				</SafeOverlayTrigger>
			</p>
		</Card>
	);
};

export default BlueprintThumbnail;
