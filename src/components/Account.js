import {faBan, faSave}        from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Button                 from 'react-bootstrap/lib/Button';
import ButtonToolbar          from 'react-bootstrap/lib/ButtonToolbar';
import Col                    from 'react-bootstrap/lib/Col';
import ControlLabel           from 'react-bootstrap/lib/ControlLabel';
import FormControl            from 'react-bootstrap/lib/FormControl';
import FormGroup              from 'react-bootstrap/lib/FormGroup';
import Grid                   from 'react-bootstrap/lib/Grid';
import Jumbotron              from 'react-bootstrap/lib/Jumbotron';
import PageHeader             from 'react-bootstrap/lib/PageHeader';
import Row                    from 'react-bootstrap/lib/Row';
import {connect}              from 'react-redux';
import {bindActionCreators}   from 'redux';

import {editedDisplayName}                         from '../actions/actionCreators';
import {app}                                       from '../base';
import {historySchema, locationSchema, userSchema} from '../propTypes';
import * as selectors                              from '../selectors';

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

	componentWillMount()
	{
		if (this.props.user)
		{
			this.setState({
				displayName: this.props.user.displayName,
			});
		}
	}

	componentWillReceiveProps(nextProps)
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
				<Jumbotron>
					<h1>{'Account Settings'}</h1>
					<p>{'Please log in with Google or GitHub in order to edit your account settings.'}</p>
				</Jumbotron>
			);
		}

		const {displayName} = this.state;

		return (
			<Jumbotron>
				<Grid>
					<Row>
						<PageHeader>
							{'Edit account settings'}
						</PageHeader>
					</Row>
					<Row>
						<form className='form-horizontal'>
							<FormGroup controlId='formHorizontalTitle'>
								<Col componentClass={ControlLabel} sm={2} autoFocus>{'Display Name'}</Col>
								<Col sm={10}>
									<FormControl
										type='text'
										name='displayName'
										placeholder='DisplayName'
										value={displayName}
										onChange={this.handleChange}
									/>
								</Col>
							</FormGroup>

							<FormGroup>
								<Col smOffset={2} sm={10}>
									<ButtonToolbar>
										<Button
											bsStyle='primary'
											bsSize='large'
											onClick={this.handleSaveAccount}
										>
											<FontAwesomeIcon icon={faSave} size='lg' />
											{' Save'}
										</Button>
										<Button
											bsSize='large'
											onClick={this.handleCancel}
										>
											<FontAwesomeIcon icon={faBan} size='lg' />
											{' Cancel'}
										</Button>
									</ButtonToolbar>
								</Col>
							</FormGroup>
						</form>
					</Row>
				</Grid>
			</Jumbotron>
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
