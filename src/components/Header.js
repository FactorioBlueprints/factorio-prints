import {faGithub, faGoogle}   from '@fortawesome/free-brands-svg-icons';
import {
	faClock,
	faCogs,
	faEnvelope,
	faHeart,
	faPlusSquare,
	faSignInAlt,
	faSignOutAlt,
	faTrophy,
	faUser,
	faWrench,
}                             from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon}      from '@fortawesome/react-fontawesome';
import {forbidExtraProps}     from 'airbnb-prop-types';
import firebase from 'firebase/app';
import 'firebase/auth';
import PropTypes              from 'prop-types';
import React, {PureComponent} from 'react';
import Dropdown               from 'react-bootstrap/lib/Dropdown';
import MenuItem               from 'react-bootstrap/lib/MenuItem';
import Nav                    from 'react-bootstrap/lib/Nav';
import Navbar                 from 'react-bootstrap/lib/Navbar';
import NavDropdown            from 'react-bootstrap/lib/NavDropdown';
import {connect}              from 'react-redux';
import {Link}                 from 'react-router-dom';
import {bindActionCreators}   from 'redux';

import {app}                           from '../base';
import {historySchema, locationSchema} from '../propTypes';
import * as selectors                  from '../selectors';

class Header extends PureComponent
{
	static propTypes = forbidExtraProps({
		user         : PropTypes.shape(forbidExtraProps({
			uid        : PropTypes.string.isRequired,
			displayName: PropTypes.string,
			photoURL   : PropTypes.string,
		})),
		match        : PropTypes.shape(forbidExtraProps({
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

		// Choose between multiple google accounts
		// http://stackoverflow.com/a/40551683/23572
		this.googleProvider.setCustomParameters({prompt: 'consent select_account'});
		this.githubProvider.setCustomParameters({allow_signup: true});
	}

	handleEdit = () =>
	{
		this.props.history.push('/account');
	}

	handleLogout = () =>
	{
		app.auth().signOut();
	};

	getSmallUserPhoto = () =>
	{
		if (this.props.user.photoURL)
		{
			return <img src={this.props.user.photoURL} alt='user' className='user-photo' />;
		}
		return <FontAwesomeIcon icon={faUser} size='2x' fixedWidth />;
	};

	getLargeUserPhoto = () =>
	{
		if (this.props.user.photoURL)
		{
			return <img src={this.props.user.photoURL} alt='user' className='user-photo-big pull-left' />;
		}
		return <FontAwesomeIcon icon={faUser} size='4x' fixedWidth />;
	};

	getDisplayName = () =>
	{
		if (this.props.user.displayName)
		{
			return <h4><b>{this.props.user.displayName}</b></h4>;
		}
		return false;
	};

	authenticate = (provider) =>
	{
		app.auth().signInWithPopup(provider).catch(error => console.error({error}));
	};

	renderAuthentication = () =>
	{
		if (this.props.user)
		{
			return (
				<Dropdown id='dropdown-logout'>
					<Dropdown.Toggle bsStyle='link'>
						{this.getSmallUserPhoto()}
					</Dropdown.Toggle>
					<Dropdown.Menu>
						<MenuItem className='user-photo-container'>
							{this.getLargeUserPhoto()}
							{this.getDisplayName()}
						</MenuItem>
						<MenuItem>
							<button className='btn btn-block btn-primary' onClick={this.handleEdit}>
								<FontAwesomeIcon icon={faWrench} size='lg' fixedWidth />
								{' Edit'}
							</button>
						</MenuItem>
						<MenuItem>
							<button className='btn btn-block btn-primary' onClick={this.handleLogout}>
								<FontAwesomeIcon icon={faSignOutAlt} size='lg' fixedWidth />
								{' Log out'}
							</button>
						</MenuItem>
					</Dropdown.Menu>
				</Dropdown>
			);
		}

		const title = (
			<span>
				<FontAwesomeIcon icon={faSignInAlt} size='lg' fixedWidth />
				{' Sign in / Join'}
			</span>
		);

		return (
			<NavDropdown title={title} id='dropdown-login'>
				<button className='google btn btn-block' onClick={() => this.authenticate(this.googleProvider)}>
					<FontAwesomeIcon icon={faGoogle} size='lg' fixedWidth />
					{' Log in with Google'}
				</button>
				<button className='github btn btn-block' onClick={() => this.authenticate(this.githubProvider)}>
					<FontAwesomeIcon icon={faGithub} size='lg' fixedWidth />
					{' Log in with GitHub'}
				</button>
			</NavDropdown>
		);
	};

	render()
	{
		return (
			<Navbar fixedTop collapseOnSelect inverse>
				<Navbar.Header>
					<Navbar.Brand>
						<Link to='/'><FontAwesomeIcon icon={faCogs} size='lg' fixedWidth />{' Factorio Prints'}</Link>
					</Navbar.Brand>
					<Navbar.Toggle />
				</Navbar.Header>

				<Navbar.Collapse>
					<Nav>
						<li>
							<Link to='/blueprints'>
								<FontAwesomeIcon icon={faClock} size='lg' fixedWidth />
								{' Most Recent'}
							</Link>
						</li>
						<li>
							<Link to='/top'>
								<FontAwesomeIcon icon={faTrophy} size='lg' fixedWidth />
								{' Most Favorited'}
							</Link>
						</li>
						<li>
							<Link to='/create'>
								<FontAwesomeIcon icon={faPlusSquare} size='lg' fixedWidth />
								{' Create'}
							</Link>
						</li>
						{this.props.user
						&& <li>
							<Link to={'/favorites'}>
								<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
								{' My Favorites'}
							</Link>
						</li>}
						{this.props.user
						&& <li>
							<Link to={`/user/${this.props.user.uid}`}>
								<FontAwesomeIcon icon={faUser} size='lg' fixedWidth />
								{' My Blueprints'}
							</Link>
						</li>}
						<li>
							<Link to='/contact'>
								<FontAwesomeIcon icon={faEnvelope} size='lg' fixedWidth />
								{' Contact me'}
							</Link>
						</li>
					</Nav>
					<Nav pullRight>
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
