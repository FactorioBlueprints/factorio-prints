import {forbidExtraProps} from 'airbnb-prop-types';

import PropTypes           from 'prop-types';
import React, {useContext} from 'react';
import Badge               from 'react-bootstrap/Badge';
import Card                from 'react-bootstrap/Card';
import {useNavigate}       from 'react-router-dom';
import SearchContext       from '../../context/searchContext';
import useBlueprint        from '../../hooks/useBlueprint';

TagLink.propTypes = forbidExtraProps({
	category: PropTypes.string.isRequired,
	name    : PropTypes.string.isRequired,
});

function TagLink({category, name})
{
	const tagString = `${category}/${name}`;

	const {setTitleFilter, setSelectedTags} = useContext(SearchContext);

	const navigate = useNavigate();

	const handleClick = () =>
	{
		setTitleFilter('');
		setSelectedTags([tagString]);
		console.log('navigate', `/blueprints?tag[0]=${tagString}`);
		navigate(`/blueprints?tag[0]=${tagString}`);
	};

	return (
		<a onClick={handleClick} style={{cursor: 'pointer'}}>
			<Badge bg='warning' className='mr-1 text-light'>
				{tagString}
			</Badge>
		</a>
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
				{
					tags.map(tag => tag.tag)
						.filter(tag => tag !== null)
						.map(({category, name}) => (
							<TagLink
								category={category}
								name={name}
								key={`${category}/${name}`}
							/>),
						)
				}
			</h4>
		</Card.Body>
	</Card>;
}

export default TagsPanel;
