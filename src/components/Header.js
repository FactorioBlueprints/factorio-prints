import React, {Component, PropTypes} from 'react';
import Navbar from 'react-bootstrap/lib/Navbar';
import Nav from 'react-bootstrap/lib/Nav';
import NavDropdown from 'react-bootstrap/lib/NavDropdown';
import Dropdown from 'react-bootstrap/lib/Dropdown';
import MenuItem from 'react-bootstrap/lib/MenuItem';
import {Link} from 'react-router';
import ReactDOM from 'react-dom';
import base from '../base';
import {auth} from 'firebase';

class Header extends Component {
	static propTypes = {
		user: PropTypes.shape({
			userId     : PropTypes.string.isRequired,
			displayName: PropTypes.string.isRequired,
			photoURL   : PropTypes.string.isRequired,
		}),
	};


	constructor()
	{
		super();

		this.googleProvider   = new auth.GoogleAuthProvider();
		this.facebookProvider = new auth.FacebookAuthProvider();
		this.twitterProvider  = new auth.TwitterAuthProvider();
		this.githubProvider   = new auth.GithubAuthProvider();

		// Choose between multiple google accounts
		// http://stackoverflow.com/a/40551683/23572
		this.googleProvider.setCustomParameters({
			'prompt': 'consent select_account'
		});
	}

	authenticate = (provider) =>
	{
		base.auth().signInWithPopup(provider).catch(error => console.error({error}));
	};

	handleLogout = () =>
	{
		base.auth().signOut();
	};

	focusOnSearch = () =>
	{
		ReactDOM.findDOMNode(this.search).focus();
	};

	renderAuthentication = () =>
	{
		if (this.props.user)
		{
			return (
				<Dropdown id='dropdown-logout'>
					<Dropdown.Toggle bsStyle='link'>
						<img src={this.props.user.photoURL} alt='user' className='user-photo' />
					</Dropdown.Toggle>
					<Dropdown.Menu>
						<MenuItem className='user-photo-container'>
							<img src={this.props.user.photoURL} alt='user' className='user-photo-big pull-left' />
							<h4><b>{this.props.user.displayName}</b></h4>
						</MenuItem>
						<MenuItem>
							<Link to={'/favorites'}>
								<button className='btn btn-block btn-default'>{'My Favorites'}</button>
							</Link>
						</MenuItem>
						<MenuItem>
							<Link to={`/user/${this.props.user.userId}`}>
								<button className='btn btn-block btn-default'>{'My Blueprints'}</button>
							</Link>
						</MenuItem>
						<MenuItem>
							<button className='btn btn-block btn-primary' onClick={this.handleLogout}>
								{'Log out'}
							</button>
						</MenuItem>
					</Dropdown.Menu>
				</Dropdown>
			);
		}
		return (
			<NavDropdown title='Sign in / Join' id='dropdown-login'>
				<button className='google btn btn-block' onClick={() => this.authenticate(this.googleProvider)}>Log in
					with Google
				</button>
				<button className='facebook btn btn-block' onClick={() => this.authenticate(this.facebookProvider)}>Log
					in with
					Facebook
				</button>
				<button className='twitter btn btn-block' onClick={() => this.authenticate(this.twitterProvider)}>Log in
					with
					Twitter
				</button>
				<button className='github btn btn-block' onClick={() => this.authenticate(this.githubProvider)}>Log in
					with GitHub
				</button>
			</NavDropdown>
		);
	};

	render()
	{
		return (
			<Navbar fixedTop>
				<Navbar.Header>
					<Navbar.Brand>
						<Link to='/'>{'Factorio Prints'}</Link>
					</Navbar.Brand>
				</Navbar.Header>

				<Navbar.Collapse>
					<Nav>
						<li><Link to='/blueprints'>{'View Blueprints'}</Link></li>
						<li><Link to='/create'>{'Create'}</Link></li>
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
