import {faCog}           from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';

import {forbidExtraProps} from 'airbnb-prop-types';
import axios              from 'axios';

import PropTypes  from 'prop-types';
import React      from 'react';
import Badge      from 'react-bootstrap/Badge';
import Card       from 'react-bootstrap/Card';
import {useQuery} from 'react-query';
import {Link}     from 'react-router-dom';

TagLink.propTypes = forbidExtraProps({
	category: PropTypes.string.isRequired,
	name    : PropTypes.string.isRequired,
});

function TagLink({category, name})
{
	const tagString = `${category}/${name}`;
	return <Link
		to={`/tagged/${tagString}/`}
		className='m-1'
	>
		<Badge variant='warning'>
			{tagString}
		</Badge>
	</Link>;
}

TagsPanel.propTypes = forbidExtraProps({
	blueprintKey: PropTypes.string.isRequired,
});

function TagsPanel(props)
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
		return <>
			<FontAwesomeIcon icon={faCog} size='lg' fixedWidth spin />
			{' Loading...'}
		</>;
	}

	if (isError)
	{
		console.log({result});
		return (
			<>
				{'Error loading blueprint details.'}
			</>
		);
	}

	const {tags} = data.data;

	return tags && tags.length > 0 && <Card>
		<Card.Header>
			Tags
		</Card.Header>
		<Card.Body>
			<h4>
				{
					tags.map(tag => tag.tag).filter(tag => tag !== null).map(({category, name}) => (
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
