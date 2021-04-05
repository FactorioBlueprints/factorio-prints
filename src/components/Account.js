import {faBan, faSave}               from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}             from '@fortawesome/react-fontawesome';
import React, {useContext, useState} from 'react';
import Button                        from 'react-bootstrap/Button';
import Col                           from 'react-bootstrap/Col';
import Container                     from 'react-bootstrap/Container';
import Form                          from 'react-bootstrap/Form';
import FormControl                   from 'react-bootstrap/FormControl';
import Jumbotron                     from 'react-bootstrap/Jumbotron';
import Row                           from 'react-bootstrap/Row';
import {useHistory}                  from 'react-router-dom';
import UserContext                   from '../context/userContext';
import PageHeader                    from './PageHeader';

Account.propTypes = {};

function Account()
{
	const user                          = useContext(UserContext);
	const [displayName, setDisplayName] = useState(user.displayName);

	const history = useHistory();

	function handleChange(event)
	{
		event.preventDefault();
		setDisplayName(event.target.value);
	}

	function handleSaveAccount(event)
	{
		event.preventDefault();

		// TODO: POST new displayName at user.uid

		history.push(`user/${user.uid}`);
	}

	function handleCancel(event)
	{
		event.preventDefault();
		history.push(`user/${user.uid}`);
	}

	if (!user)
	{
		return (
			<Jumbotron>
				<h1 className='display-4'>
					{'Account Settings'}
				</h1>
				<p className='lead'>
					{'Please log in with Google or GitHub in order to edit your account settings.'}
				</p>
			</Jumbotron>
		);
	}

	return (
		<Container>
			<PageHeader title='Edit account settings' />
			<Row>
				<Form className='w-100'>
					<Form.Group as={Row}>
						<Form.Label column sm='2'>
							{'Display Name'}
						</Form.Label>
						<Col sm={10}>
							<FormControl
								autoFocus
								type='text'
								name='displayName'
								placeholder='DisplayName'
								value={displayName}
								onChange={handleChange}
							/>
						</Col>
					</Form.Group>

					<Form.Group as={Row}>
						<Col sm={{span: 10, offset: 2}}>
							<Button
								type='button'
								variant='warning'
								size='lg'
								onClick={handleSaveAccount}
							>
								<FontAwesomeIcon icon={faSave} size='lg' />
								{' Save'}
							</Button>
							<Button
								type='button'
								size='lg'
								onClick={handleCancel}
							>
								<FontAwesomeIcon icon={faBan} size='lg' />
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
