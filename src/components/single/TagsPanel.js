import {forbidExtraProps} from 'airbnb-prop-types';

import PropTypes from 'prop-types';
import React     from 'react';
import Button    from 'react-bootstrap/Button';
import Card      from 'react-bootstrap/Card';

import {useNavigate} from 'react-router-dom';

import {ArrayParam, useQueryParam, withDefault} from 'use-query-params';

import useBlueprint from '../../hooks/useBlueprint';

TagLink.propTypes = forbidExtraProps({
	category: PropTypes.string.isRequired,
	name    : PropTypes.string.isRequired,
});

function TagLink({category, name})
{
	const tagString = `${category}/${name}`;

	const [, setTags] = useQueryParam('tags', withDefault(ArrayParam, []));

	const navigate = useNavigate();

	const handleClick = () =>
	{
		setTags([tagString]);
		navigate(`/blueprints?tags=${tagString}`);
	};

	return (
		<Button variant="outline-warning" onClick={handleClick} className='mt-1 ml-1' size="sm">
			{tagString}
		</Button>

	);
}

TagsPanel.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function TagsPanel({blueprintKey})
{
	const result = useBlueprint(blueprintKey);

	const {tags} = result.data.data;

	return tags && tags.length > 0 && <Card>
		<Card.Header>
			Tags
		</Card.Header>
		<Card.Body>
			<h4>
				{tags.map(({tagCategory, tagName}) => (
					<TagLink
						category={tagCategory}
						name={tagName}
						key={`${tagCategory}/${tagName}`}
					/>))
				}
			</h4>
		</Card.Body>
	</Card>;
}

export default TagsPanel;
