import {faCalendar, faClock, faHeart, faUser} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import DateDisplay from '../DateDisplay';
import DisplayName from '../DisplayName';
import FavoriteCount from '../FavoriteCount';

interface PostInfoCardProps {
	authorUserId?: string;
	createdDate?: number;
	lastUpdatedDate?: number;
	numberOfFavorites?: number;
	isLoading: boolean;
}

export function PostInfoCard({
	authorUserId,
	createdDate,
	lastUpdatedDate,
	numberOfFavorites,
	isLoading,
}: PostInfoCardProps) {
	return (
		<Card>
			<Card.Header>Post Info</Card.Header>
			<Table
				bordered
				hover
			>
				<tbody>
					<tr>
						<td>
							<FontAwesomeIcon
								icon={faUser}
								size="lg"
								fixedWidth
							/>
							{' Author'}
						</td>
						<td>
							<DisplayName
								userId={authorUserId}
								externalIsLoading={isLoading}
							/>
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon
								icon={faCalendar}
								size="lg"
								fixedWidth
							/>
							{' Created'}
						</td>
						<td>
							<DateDisplay
								date={createdDate}
								isLoading={isLoading}
							/>
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon
								icon={faClock}
								size="lg"
								fixedWidth
							/>
							{' Last Updated'}
						</td>
						<td>
							<DateDisplay
								date={lastUpdatedDate}
								isLoading={isLoading}
							/>
						</td>
					</tr>
					<tr>
						<td>
							<FontAwesomeIcon
								icon={faHeart}
								size="lg"
								fixedWidth
							/>
							{' Favorites'}
						</td>
						<td>
							<FavoriteCount
								count={numberOfFavorites}
								isLoading={isLoading}
							/>
						</td>
					</tr>
				</tbody>
			</Table>
		</Card>
	);
}
