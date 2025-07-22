import flatMap from 'lodash/flatMap';
import Card from 'react-bootstrap/Card';
import TagBadge from '../TagBadge';

interface TagsCardProps {
	tags: string[];
}

export function TagsCard({tags}: TagsCardProps) {
	if (!tags || tags.length === 0) {
		return null;
	}

	return (
		<Card>
			<Card.Header>Tags</Card.Header>
			<Card.Body>
				<h4>
					{flatMap(tags, (tag) => (
						<TagBadge
							key={tag}
							tag={tag}
						/>
					))}
				</h4>
			</Card.Body>
		</Card>
	);
}
