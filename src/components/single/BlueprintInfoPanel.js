import {faCalendar, faClock, faCodeBranch, faHeart, faUser} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';

import axios       from 'axios';
import moment      from 'moment';
import PropTypes   from 'prop-types';
import React       from 'react';
import Card        from 'react-bootstrap/Card';
import Table       from 'react-bootstrap/Table';
import {useQuery}  from 'react-query';
import {Link}      from 'react-router-dom';
import LoadingIcon from '../LoadingIcon';

import BlueprintVersion from './BlueprintVersion';

BlueprintInfoPanel.propTypes = forbidExtraProps({
	blueprintKey      : PropTypes.string.isRequired,
	ownedByCurrentUser: PropTypes.bool.isRequired,
});

function BlueprintInfoPanel(props)
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
			<LoadingIcon isLoading={isLoading} />
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

	const {createdOn, systemFrom, author: {userId: authorId, displayName}, numberOfUpvotes} = data.data;

	return (
		<Card>
			<Card.Header>
				Info
			</Card.Header>
			<Table bordered hover>
				<tbody>
					<tr>
						<td>
							<FontAwesomeIcon icon={faUser} size='lg' fixedWidth />
							{' Author'}
						</td>
						<td>
							<Link to={`/user/${authorId}`}>
								{displayName}
								{props.ownedByCurrentUser && <span className='pull-right'><b>{' (You)'}</b></span>}
							</Link>
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon icon={faCalendar} size='lg' fixedWidth />
							{' Created'}
						</td>
						<td>
							<span
								title={moment(createdOn).format('dddd, MMMM Do YYYY, h:mm:ss a')}
							>
								{moment(createdOn).fromNow()}
							</span>
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon icon={faClock} size='lg' fixedWidth />
							{' Last Updated'}
						</td>
						<td>
							<span
								title={moment(systemFrom).format('dddd, MMMM Do YYYY, h:mm:ss a')}
							>
								{moment(systemFrom).fromNow()}
							</span>
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
							{' Favorites'}
						</td>
						<td>
							{numberOfUpvotes}
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon icon={faCodeBranch} size='lg' fixedWidth />
							{' Version'}
						</td>
						<td>
							<BlueprintVersion blueprintKey={props.blueprintKey} />
						</td>
					</tr>
				</tbody>
			</Table>
		</Card>);
}

export default BlueprintInfoPanel;
