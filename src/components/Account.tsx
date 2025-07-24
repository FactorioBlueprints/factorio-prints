import {faBan, faSave} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {getAuth, updateProfile} from 'firebase/auth';
import {getDatabase, ref, set} from 'firebase/database';
import React, {useEffect, useState} from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Row from 'react-bootstrap/Row';
import {useAuthState} from 'react-firebase-hooks/auth';
import {useNavigate} from '@tanstack/react-router';

import {app} from '../base';
import PageHeader from './PageHeader';

const Account = () => {
	const [user] = useAuthState(getAuth(app));
	const navigate = useNavigate();
	const [displayName, setDisplayName] = useState('');
	const queryClient = useQueryClient();

	const updateDisplayNameMutation = useMutation({
		mutationFn: async (newDisplayName: string) => {
			await updateProfile(user!, {
				displayName: newDisplayName,
			});

			const userRef = ref(getDatabase(app), `/users/${user!.uid}/displayName/`);
			await set(userRef, newDisplayName);

			return newDisplayName;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({queryKey: ['userDisplayName', user!.uid]});
			navigate({to: '/user/$userId', params: {userId: user!.uid}});
		},
		onError: (error) => {
			console.error('Error updating display name:', error);
		},
	});

	useEffect(() => {
		if (user) {
			setDisplayName(user.displayName || '');
		}
	}, [user]);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		event.preventDefault();
		setDisplayName(event.target.value);
	};

	const handleSaveAccount = (event: React.MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		updateDisplayNameMutation.mutate(displayName);
	};

	const handleCancel = (event: React.MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		navigate({to: '/user/$userId', params: {userId: user!.uid}});
	};

	if (!user) {
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">{'Account Settings'}</h1>
				<p className="lead">{'Please log in with Google or GitHub in order to edit your account settings.'}</p>
			</div>
		);
	}

	return (
		<Container>
			<PageHeader title="Edit account settings" />
			<Row>
				<Form className="w-100">
					<Form.Group
						as={Row}
						className="mb-3"
					>
						<Form.Label
							column
							sm="2"
						>
							{'Display Name'}
						</Form.Label>
						<Col sm={10}>
							<FormControl
								autoFocus
								type="text"
								name="displayName"
								placeholder="DisplayName"
								value={displayName}
								onChange={handleChange}
							/>
						</Col>
					</Form.Group>

					<Form.Group
						as={Row}
						className="mb-3"
					>
						<Col sm={{span: 10, offset: 2}}>
							<Button
								type="button"
								variant="warning"
								size="lg"
								onClick={handleSaveAccount}
								disabled={updateDisplayNameMutation.isPending}
							>
								<FontAwesomeIcon
									icon={faSave}
									size="lg"
								/>
								{updateDisplayNameMutation.isPending ? ' Saving...' : ' Save'}
							</Button>
							<Button
								type="button"
								size="lg"
								onClick={handleCancel}
								disabled={updateDisplayNameMutation.isPending}
							>
								<FontAwesomeIcon
									icon={faBan}
									size="lg"
								/>
								{' Cancel'}
							</Button>
						</Col>
					</Form.Group>
				</Form>
			</Row>
		</Container>
	);
};

export default Account;
