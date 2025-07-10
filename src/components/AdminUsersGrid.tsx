import {faCog, faHeart, faImage, faUser} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {getAuth} from 'firebase/auth';
import React, {ChangeEvent, useMemo, useState} from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import {useAuthState} from 'react-firebase-hooks/auth';
import {Link} from '@tanstack/react-router';

import {app} from '../base';
import {UserData} from '../api/firebase';
import useAllUsers from '../hooks/useAllUsers';
import {useIsModerator} from '../hooks/useModerators';

import PageHeader from './PageHeader';

type SortField = 'displayName' | 'email' | 'favoritesCount' | 'blueprintsCount';
type SortDirection = 'asc' | 'desc';

function AdminUsersGrid(): React.JSX.Element | null {
	const [user] = useAuthState(getAuth(app));
	const moderatorQuery = useIsModerator(user?.uid);
	const isModerator = moderatorQuery.data ?? false;
	const [searchTerm, setSearchTerm] = useState<string>('');
	const [sortBy, setSortBy] = useState<SortField>('favoritesCount');
	const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

	const {data: allUsers, isLoading, error} = useAllUsers(isModerator);

	const filteredAndSortedUsers = useMemo((): UserData[] => {
		if (!allUsers) return [];

		const filtered = searchTerm
			? allUsers.filter(
					(user) =>
						(user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
						(user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
						user.id.toLowerCase().includes(searchTerm.toLowerCase()),
				)
			: allUsers;

		return [...filtered].sort((a, b) => {
			let result = 0;

			if (sortBy === 'displayName') {
				result = (a.displayName || '').localeCompare(b.displayName || '');
			} else if (sortBy === 'favoritesCount') {
				result = (a.favoritesCount || 0) - (b.favoritesCount || 0);
			} else if (sortBy === 'blueprintsCount') {
				result = (a.blueprintsCount || 0) - (b.blueprintsCount || 0);
			} else if (sortBy === 'email') {
				result = (a.email || '').localeCompare(b.email || '');
			}

			return sortDirection === 'desc' ? -result : result;
		});
	}, [allUsers, searchTerm, sortBy, sortDirection]);

	const handleHeaderClick = (field: SortField): void => {
		if (sortBy === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
		} else {
			setSortBy(field);
			setSortDirection('desc');
		}
	};

	const renderSortIndicator = (field: SortField): string | null => {
		if (sortBy !== field) return null;
		return sortDirection === 'asc' ? ' ↑' : ' ↓';
	};

	const handleSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
		setSearchTerm(event.target.value);
	};

	if (user && !isModerator) {
		// TODO 2025-04-19: Instead, show information explaining that this user is not an administrator.
		return null;
	}

	if (!user) {
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">Admin Access Required</h1>
				<p className="lead">Please log in with an administrator account to access this page.</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">
					<FontAwesomeIcon
						icon={faCog}
						spin
					/>
					{' Loading users...'}
				</h1>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">Error Loading Users</h1>
				<p className="lead">An error occurred while loading users: {error.message}</p>
			</div>
		);
	}

	return (
		<Container fluid>
			<PageHeader title="Admin: User Management" />

			<Form.Group className="mb-3">
				<Form.Control
					type="text"
					placeholder="Search users by name, email, or ID..."
					value={searchTerm}
					onChange={handleSearchChange}
				/>
			</Form.Group>

			<Row className="mb-4">
				<div className="col-12">
					<p className="text-muted">
						Found {filteredAndSortedUsers.length} users
						{searchTerm ? ` matching "${searchTerm}"` : ''}
					</p>
				</div>
			</Row>

			<div className="table-responsive">
				<Table
					striped
					bordered
					hover
				>
					<thead>
						<tr>
							<th
								onClick={() => handleHeaderClick('displayName')}
								style={{cursor: 'pointer'}}
							>
								<FontAwesomeIcon
									icon={faUser}
									className="me-2"
								/>
								User Name{renderSortIndicator('displayName')}
							</th>
							<th
								onClick={() => handleHeaderClick('email')}
								style={{cursor: 'pointer'}}
							>
								Email{renderSortIndicator('email')}
							</th>
							<th
								onClick={() => handleHeaderClick('favoritesCount')}
								style={{cursor: 'pointer'}}
							>
								<FontAwesomeIcon
									icon={faHeart}
									className="me-2"
								/>
								Favorites{renderSortIndicator('favoritesCount')}
							</th>
							<th
								onClick={() => handleHeaderClick('blueprintsCount')}
								style={{cursor: 'pointer'}}
							>
								<FontAwesomeIcon
									icon={faImage}
									className="me-2"
								/>
								Blueprints{renderSortIndicator('blueprintsCount')}
							</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{filteredAndSortedUsers.map((user) => (
							<tr key={user.id}>
								<td>
									<Link
										to="/admin/user/$userId"
										params={{userId: user.id}}
									>
										{user.displayName || '(Anonymous)'}
									</Link>
								</td>
								<td>{user.email || 'No email'}</td>
								<td>{user.favoritesCount || 0}</td>
								<td>{user.blueprintsCount || 0}</td>
								<td>
									<Link
										to="/admin/user/$userId"
										params={{userId: user.id}}
									>
										<Button
											variant="primary"
											size="sm"
										>
											View Details
										</Button>
									</Link>
								</td>
							</tr>
						))}
						{filteredAndSortedUsers.length === 0 && (
							<tr>
								<td
									colSpan={5}
									className="text-center"
								>
									No users found
								</td>
							</tr>
						)}
					</tbody>
				</Table>
			</div>
		</Container>
	);
}

export default AdminUsersGrid;
