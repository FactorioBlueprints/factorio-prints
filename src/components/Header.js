import {faGithub, faGoogle}   from '@fortawesome/free-brands-svg-icons';
import {
	faClock,
	faCogs,
	faEnvelope,
	faHeart,
	faSignInAlt,
	faSignOutAlt,
	faTrophy,
	faUser,
	faWrench,
}                             from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import firebase               from 'firebase/app';
import 'firebase/auth';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Button                 from 'react-bootstrap/Button';
import Dropdown               from 'react-bootstrap/Dropdown';
import Nav                    from 'react-bootstrap/Nav';
import Navbar                 from 'react-bootstrap/Navbar';
import NavDropdown            from 'react-bootstrap/NavDropdown';
import {connect}              from 'react-redux';
import {Link}                 from 'react-router-dom';
import {bindActionCreators}   from 'redux';
import {app}                  from '../base';
import {
	historySchema,
	locationSchema,
}                             from '../propTypes';
import * as selectors         from '../selectors';

class Header extends PureComponent
{
	static propTypes = forbidExtraProps({
		user: PropTypes.shape(forbidExtraProps({
			uid        : PropTypes.string.isRequired,
			displayName: PropTypes.string,
			photoURL   : PropTypes.string,
		})),
		match: PropTypes.shape(forbidExtraProps({
			params : PropTypes.shape(forbidExtraProps({})).isRequired,
			path   : PropTypes.string.isRequired,
			url    : PropTypes.string.isRequired,
			isExact: PropTypes.bool.isRequired,
		})).isRequired,
		location     : locationSchema,
		history      : historySchema,
		staticContext: PropTypes.shape(forbidExtraProps({})),
	});

	constructor()
	{
		super();

		this.googleProvider   = new firebase.auth.GoogleAuthProvider();
		this.facebookProvider = new firebase.auth.FacebookAuthProvider();
		this.twitterProvider  = new firebase.auth.TwitterAuthProvider();
		this.githubProvider   = new firebase.auth.GithubAuthProvider();

		/*
		 * Choose between multiple google accounts
		 * http://stackoverflow.com/a/40551683/23572
		 */
		this.googleProvider.setCustomParameters({prompt: 'consent select_account'});
		this.githubProvider.setCustomParameters({allow_signup: true});
	}

	handleEdit = () =>
	{
		this.props.history.push('account');
	}

	handleLogout = () =>
	{
		app.auth().signOut();
	};

	getDisplayName = () =>
	{
		if (this.props.user.displayName)
		{
			return (
				<h2>
					<b>
						{this.props.user.displayName}
					</b>
				</h2>
			);
		}
		return false;
	};

	authenticate = (provider) =>
	{
		app.auth().signInWithPopup(provider)
			.then((authData) =>
			{
				console.log({authData});
			})
			.catch(error => console.error({error}));
	};

	renderAuthentication = () =>
	{
		if (this.props.user)
		{
			return (
				<Dropdown className='text-light'>
					<Dropdown.Toggle variant='link'>
						Account Settings


     </Dropdown.Toggle>
					<Dropdown.Menu className='dropdown-menu-right'>
						<Dropdown.Item className='user-photo-container'>
							{this.getDisplayName()}
						</Dropdown.Item>
						<Dropdown.Item>
							<Button type='button' block variant='warning' size='lg' onClick={this.handleEdit}>
								<FontAwesomeIcon icon={faWrench} size='lg' fixedWidth />
								{' Edit'}
							</Button>
						</Dropdown.Item>
						<Dropdown.Item>
							<Button type='button' block variant='warning' size='lg' onClick={this.handleLogout}>
								<FontAwesomeIcon icon={faSignOutAlt} size='lg' fixedWidth />
								{' Log out'}
							</Button>
						</Dropdown.Item>
					</Dropdown.Menu>
				</Dropdown>
			);
		}

		const title = (
			<span className='text-light'>
				<FontAwesomeIcon icon={faSignInAlt} size='lg' fixedWidth />
				{' Sign in / Join'}
			</span>
		);

		return (
			<NavDropdown title={title} style={{minWidth: '210px'}}>
				<Button type='button' block className='google' onClick={() => this.authenticate(this.googleProvider)}>
					<FontAwesomeIcon icon={faGoogle} size='lg' fixedWidth />
					{' Log in with Google'}
				</Button>
				<Button type='button' block className='github' onClick={() => this.authenticate(this.githubProvider)}>
					<FontAwesomeIcon icon={faGithub} size='lg' fixedWidth />
					{' Log in with GitHub'}
				</Button>
			</NavDropdown>
		);
	};

	render()
	{
		return (
			<Navbar expand='lg' sticky='top' collapseOnSelect bg='warning'>
				<Navbar.Brand>
					<Link to='/'>
						<FontAwesomeIcon icon={faCogs} size='lg' fixedWidth />
						{' Factorio Prints'}
					</Link>
				</Navbar.Brand>
				<Navbar.Toggle />

				<Navbar.Collapse>
					<Nav className='mr-auto'>
						{/* From https://github.com/ReactTraining/react-router/issues/4463#issuecomment-342838735 */}
						<Nav.Link as={Link} href='/blueprints' to='/blueprints' className='text-light'>
							<FontAwesomeIcon icon={faClock} size='lg' fixedWidth />
							{' Most Recent'}
						</Nav.Link>
						<Nav.Link as={Link} href='/top' to='/top' className='text-light'>
							<FontAwesomeIcon icon={faTrophy} size='lg' fixedWidth />
							{' Most Favorited'}
						</Nav.Link>
						{this.props.user
						&& <Nav.Link as={Link} href='/favorites' to='/favorites' className='text-light'>
							<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
							{' My Favorites'}
						</Nav.Link>}
						{this.props.user
						&& <Nav.Link as={Link} href={`/user/${this.props.user.uid}`} to={`/user/${this.props.user.uid}`} className='text-light'>
							<FontAwesomeIcon icon={faUser} size='lg' fixedWidth />
							{' My Blueprints'}
						</Nav.Link>}
						<Nav.Link as={Link} href='/contact' to='/contact' className='text-light'>
							<FontAwesomeIcon icon={faEnvelope} size='lg' fixedWidth />
							{' Contact me'}
						</Nav.Link>
					</Nav>
					<Nav className='mr-sm-2' justify>
						{this.renderAuthentication()}
					</Nav>
				</Navbar.Collapse>
			</Navbar>
		);
	}
}

const mapStateToProps = storeState => ({
	user: selectors.getUser(storeState),
});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(Header);
