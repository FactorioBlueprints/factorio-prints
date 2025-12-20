import {faHeart} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {Link} from '@tanstack/react-router';
import type React from 'react';
import Card from 'react-bootstrap/Card';
import Tooltip from 'react-bootstrap/Tooltip';

import type {RestBlueprintSummary} from '../../api/rest/types';
import buildImageUrl from '../../helpers/buildImageUrl';
import {RichText} from '../core/text/RichText';
import SafeOverlayTrigger from '../SafeOverlayTrigger';

interface RestBlueprintThumbnailProps {
	blueprintSummary: RestBlueprintSummary;
}

const RestBlueprintThumbnail: React.FC<RestBlueprintThumbnailProps> = ({blueprintSummary}) => {
	const {key, title, imgurImage, voteSummary} = blueprintSummary;
	const {imgurId, imgurType} = imgurImage;
	const numberOfFavorites = voteSummary.numberOfUpvotes;

	const tooltip = (
		<Tooltip>
			<RichText
				text={title}
				inline
			/>
		</Tooltip>
	);

	let imageUrl: string;
	try {
		if (!imgurId || !imgurType) {
			imageUrl = '/icons/entity-unknown.png';
		} else {
			imageUrl = buildImageUrl(imgurId, imgurType, 'b');
		}
	} catch {
		imageUrl = '/icons/entity-unknown.png';
	}

	return (
		<Card
			className="blueprint-thumbnail col-auto"
			style={{width: '11rem', backgroundColor: '#1c1e22'}}
		>
			<Link
				to="/view/$blueprintId"
				params={{blueprintId: key}}
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
				<span className="text-default">
					<FontAwesomeIcon
						icon={faHeart}
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
						preload={false}
					>
						<span className="text-default">
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

export default RestBlueprintThumbnail;
