import {faBan, faSave}        from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Button                 from 'react-bootstrap/Button';
import Col                    from 'react-bootstrap/Col';
import Container              from 'react-bootstrap/Container';
import Form                   from 'react-bootstrap/Form';
import FormControl            from 'react-bootstrap/FormControl';
import Row                    from 'react-bootstrap/Row';
import {connect}              from 'react-redux';
import {bindActionCreators}   from 'redux';

import {editedDisplayName}                         from '../actions/actionCreators';
import {app}                                       from '../base';
import {historySchema, locationSchema, userSchema} from '../propTypes';
import * as selectors                              from '../selectors';
import PageHeader                                  from './PageHeader';

class Account extends PureComponent
{
	static propTypes = forbidExtraProps({
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

	static initialState = {
		displayName: '',
	};

	state = Account.initialState;

	UNSAFE_componentWillMount()
	{
		if (this.props.user)
		{
			this.setState({
				displayName: this.props.user.displayName,
			});
		}
	}

	UNSAFE_componentWillReceiveProps(nextProps)
	{
		if (nextProps.user)
		{
			this.setState({
				displayName: nextProps.user.displayName,
			});
		}
	}

	handleChange = (event) =>
	{
		event.preventDefault();
		this.setState({
			[event.target.name]: event.target.value,
		});
	};

	handleSaveAccount = (event) =>
	{
		event.preventDefault();
		app.database()
			.ref(`/users/${this.props.user.uid}/displayName/`)
			.set(this.state.displayName)
			.then(() => this.props.editedDisplayName(this.state.displayName))
			.then(() => this.props.history.push(`/user/${this.props.user.uid}`))
			.catch((...args) => console.log('Account.handleSaveAccount', args));
	};

	handleCancel = (event) =>
	{
		event.preventDefault();
		this.props.history.push(`/user/${this.props.user.uid}`);
	};

	render()
	{
		if (!this.props.user)
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

		const {displayName} = this.state;

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
									onChange={this.handleChange}
								/>
							</Col>
						</Form.Group>

						<Form.Group as={Row}>
							<Col sm={{span: 10, offset: 2}}>
								<Button
									type='button'
									variant='warning'
									size='lg'
									onClick={this.handleSaveAccount}
								>
									<FontAwesomeIcon icon={faSave} size='lg' />
									{' Save'}
								</Button>
								<Button
									type='button'
									size='lg'
									onClick={this.handleCancel}
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
}

const mapStateToProps = storeState => ({
	user: selectors.getFilteredUser(storeState),
});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {editedDisplayName};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(Account);
