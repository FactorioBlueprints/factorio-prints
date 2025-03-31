import {faBan, faSave}    from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';
import React, {useEffect, useState} from 'react';
import Button             from 'react-bootstrap/Button';
import Col                from 'react-bootstrap/Col';
import Container          from 'react-bootstrap/Container';
import Form               from 'react-bootstrap/Form';
import FormControl        from 'react-bootstrap/FormControl';
import Row                from 'react-bootstrap/Row';
import {connect}          from 'react-redux';
import {bindActionCreators} from 'redux';

import {editedDisplayName}                         from '../actions/actionCreators';
import {database}                                  from '../base';
import {ref, set}                                  from 'firebase/database';
import {historySchema, locationSchema, userSchema} from '../propTypes';
import * as selectors                              from '../selectors';
import PageHeader                                  from './PageHeader';

const Account = ({
	user,
	match,
	location,
	history,
	staticContext,
	editedDisplayName,
}) =>
{
	const [displayName, setDisplayName] = useState('');

	useEffect(() =>
	{
		if (user)
		{
			setDisplayName(user.displayName);
		}
	}, [user]);

	const handleChange = (event) =>
	{
		event.preventDefault();
		setDisplayName(event.target.value);
	};

	const handleSaveAccount = (event) =>
	{
		event.preventDefault();

		const userRef = ref(database, `/users/${user.uid}/displayName/`);

		set(userRef, displayName)
			.then(() => editedDisplayName(displayName))
			.then(() => history.push(`/user/${user.uid}`))
			.catch((...args) => console.log('Account.handleSaveAccount', args));
	};

	const handleCancel = (event) =>
	{
		event.preventDefault();
		history.push(`/user/${user.uid}`);
	};

	if (!user)
	{
		return (
			<div className='p-5 rounded-lg jumbotron'>
				<h1 className='display-4'>
					{'Account Settings'}
				</h1>
				<p className='lead'>
					{'Please log in with Google or GitHub in order to edit your account settings.'}
				</p>
			</div>
		);
	}

	return (
		<Container>
			<PageHeader title='Edit account settings' />
			<Row>
				<Form className='w-100'>
					<Form.Group as={Row} className='mb-3'>
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

					<Form.Group as={Row} className='mb-3'>
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
};

Account.propTypes = forbidExtraProps({
	user : userSchema,
	match: PropTypes.shape(forbidExtraProps({
		params : PropTypes.shape(forbidExtraProps({})).isRequired,
		path   : PropTypes.string.isRequired,
		url    : PropTypes.string.isRequired,
		isExact: PropTypes.bool.isRequired,
	})).isRequired,
	location         : locationSchema,
	history          : historySchema,
	staticContext    : PropTypes.shape(forbidExtraProps({})),
	editedDisplayName: PropTypes.func.isRequired,
});

const mapStateToProps = storeState => ({
	user: selectors.getFilteredUser(storeState),
});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {editedDisplayName};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(Account);
