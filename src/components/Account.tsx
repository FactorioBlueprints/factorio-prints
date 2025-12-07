import {faBan, faSave} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useContext, useState} from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import FormControl from 'react-bootstrap/FormControl';
import Row from 'react-bootstrap/Row';
import {useNavigate} from 'react-router-dom';
import UserContext from '../context/userContext';
import PageHeader from './PageHeader';

function Account() {
	const {user} = useContext(UserContext);
	const [displayName, setDisplayName] = useState(user?.displayName);

	const navigate = useNavigate();

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		event.preventDefault();
		setDisplayName(event.target.value);
	}

	if (!user) {
		return (
			<div className="p-5 rounded-lg jumbotron">
				<h1 className="display-4">{'Account Settings'}</h1>
				<p className="lead">{'Please log in with Google or GitHub in order to edit your account settings.'}</p>
			</div>
		);
	}

	const userId = user.uid;

	function handleSaveAccount(event: React.MouseEvent<HTMLButtonElement>) {
		event.preventDefault();

		// TODO: POST new displayName at userId

		navigate(`user/${userId}`);
	}

	function handleCancel(event: React.MouseEvent<HTMLButtonElement>) {
		event.preventDefault();
		navigate(`user/${userId}`);
	}

	return (
		<Container>
			<PageHeader title="Edit account settings" />
			<Row>
				<Form className="w-100">
					<Form.Group as={Row}>
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
								value={displayName ?? ''}
								onChange={handleChange}
							/>
						</Col>
					</Form.Group>

					<Form.Group as={Row}>
						<Col sm={{span: 10, offset: 2}}>
							<Button
								type="button"
								variant="warning"
								size="lg"
								onClick={handleSaveAccount}
							>
								<FontAwesomeIcon
									icon={faSave}
									size="lg"
								/>
								{' Save'}
							</Button>
							<Button
								type="button"
								size="lg"
								onClick={handleCancel}
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
}

export default Account;
