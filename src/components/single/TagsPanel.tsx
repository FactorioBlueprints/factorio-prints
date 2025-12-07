import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

import {useNavigate} from 'react-router-dom';

import {ArrayParam, useQueryParam, withDefault} from 'use-query-params';

import useBlueprint from '../../hooks/useBlueprint';

interface TagLinkProps {
	category: string;
	name: string;
}

function TagLink({category, name}: TagLinkProps) {
	const tagString = `${category}/${name}`;

	const [, setTags] = useQueryParam('tags', withDefault(ArrayParam, []));

	const navigate = useNavigate();

	const handleClick = () => {
		setTags([tagString]);
		navigate(`/blueprints?tags=${tagString}`);
	};

	return (
		<Button
			variant="outline-warning"
			onClick={handleClick}
			className="mt-1 ml-1"
			size="sm"
		>
			{tagString}
		</Button>
	);
}

interface TagsPanelProps {
	blueprintKey: string;
}

function TagsPanel({blueprintKey}: TagsPanelProps) {
	const result = useBlueprint(blueprintKey);

	const {tags} = result.data!.data;

	return (
		tags &&
		tags.length > 0 && (
			<Card>
				<Card.Header>Tags</Card.Header>
				<Card.Body>
					<h4>
						{tags.map(({tagCategory, tagName}: {tagCategory: string; tagName: string}) => (
							<TagLink
								category={tagCategory}
								name={tagName}
								key={`${tagCategory}/${tagName}`}
							/>
						))}
					</h4>
				</Card.Body>
			</Card>
		)
	);
}

export default TagsPanel;
