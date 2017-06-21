import {forbidExtraProps} from 'airbnb-prop-types';
import {auth} from 'firebase';
import PropTypes from 'prop-types';
import React, {PureComponent} from 'react';
import Dropdown from 'react-bootstrap/lib/Dropdown';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import Nav from 'react-bootstrap/lib/Nav';
import Navbar from 'react-bootstrap/lib/Navbar';
import NavDropdown from 'react-bootstrap/lib/NavDropdown';
import FontAwesome from 'react-fontawesome';
import {Link} from 'react-router';

import {app} from '../base';

class Header extends PureComponent
{
	static propTypes = forbidExtraProps({
		user: PropTypes.shape(forbidExtraProps({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string,
			photoURL   : PropTypes.string,
		})),
	});

	constructor()
	{
		super();

		this.googleProvider   = new auth.GoogleAuthProvider();
		this.facebookProvider = new auth.FacebookAuthProvider();
		this.twitterProvider  = new auth.TwitterAuthProvider();
		this.githubProvider   = new auth.GithubAuthProvider();

		// Choose between multiple google accounts
		// http://stackoverflow.com/a/40551683/23572
		this.googleProvider.setCustomParameters({prompt: 'consent select_account'});
		this.githubProvider.setCustomParameters({allow_signup: true});
	}

	authenticate = (provider) =>
	{
		app.auth().signInWithPopup(provider).catch(error => console.error({error}));
	};

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
		return <FontAwesome name='user' size='2x' fixedWidth />;
	};

	getLargeUserPhoto = () =>
	{
		if (this.props.user.photoURL)
		{
			return <img src={this.props.user.photoURL} alt='user' className='user-photo-big pull-left' />;
		}
		return <FontAwesome name='user' size='4x' fixedWidth />;
	};

	getDisplayName = () =>
	{
		if (this.props.user.displayName)
		{
			return <h4><b>{this.props.user.displayName}</b></h4>;
		}
		return false;
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
							<button className='btn btn-block btn-primary' onClick={this.handleLogout}>
								<FontAwesome name='sign-out' size='lg' fixedWidth />
								{' Log out'}
							</button>
						</MenuItem>
					</Dropdown.Menu>
				</Dropdown>
			);
		}

		const title =
			<span>
				<FontAwesome name='sign-in' size='lg' fixedWidth />
				{' Sign in / Join'}
			</span>;

		return (
			<NavDropdown title={title} id='dropdown-login'>
				<button className='google btn btn-block' onClick={() => this.authenticate(this.googleProvider)}>
					<FontAwesome name='google' size='lg' fixedWidth />
					{' Log in with Google'}
				</button>
				<button className='github btn btn-block' onClick={() => this.authenticate(this.githubProvider)}>
					<FontAwesome name='github' size='lg' fixedWidth />
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
						<Link to='/'><FontAwesome name='cogs' size='lg' fixedWidth />{' Factorio Prints'}</Link>
					</Navbar.Brand>
					<Navbar.Toggle />
				</Navbar.Header>

				<Navbar.Collapse>
					<Nav>
						<li><Link to='/blueprints'><FontAwesome name='clock-o' size='lg' fixedWidth />{' Most Recent'}</Link></li>
						<li><Link to='/top'><FontAwesome name='trophy' size='lg' fixedWidth />{' Most Favorited'}</Link></li>
						<li><Link to='/create'><FontAwesome name='plus-square' size='lg' fixedWidth />{' Create'}</Link></li>
						{this.props.user && <li><Link to={'/favorites'}><FontAwesome name='heart' size='lg' fixedWidth />{' My Favorites'}</Link></li>}
						{this.props.user && <li><Link to={`/user/${this.props.user.userId}`}><FontAwesome name='user' size='lg' fixedWidth />{' My Blueprints'}</Link></li>}
						<li><Link to='/contact'><FontAwesome name='envelope' size='lg' fixedWidth />{' Contact me'}</Link></li>
					</Nav>
					<Nav pullRight>
						{this.renderAuthentication()}
					</Nav>
				</Navbar.Collapse>
			</Navbar>
		);
	}
}

export default Header;
