import {faPatreon, faDiscord, faGithub, faGoogle} from '@fortawesome/free-brands-svg-icons';

import {
	faClock,
	faCogs,
	faDonate,
	faHeart,
	faPlusSquare,
	faSignInAlt,
	faSignOutAlt,
	faTrophy,
	faUser,
	faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}   from '@fortawesome/react-fontawesome';
import {forbidExtraProps}  from 'airbnb-prop-types';
import firebase            from 'firebase/app';
import 'firebase/auth';
import React, {useContext} from 'react';

import Button      from 'react-bootstrap/Button';
import Container   from 'react-bootstrap/Container';
import Dropdown    from 'react-bootstrap/Dropdown';
import Nav         from 'react-bootstrap/Nav';
import Navbar      from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

import {Link, useNavigate} from 'react-router-dom';
import {app}               from '../base';
import UserContext         from '../context/userContext';

const googleProvider   = new firebase.auth.GoogleAuthProvider();
// const facebookProvider = new firebase.auth.FacebookAuthProvider();
// const twitterProvider  = new firebase.auth.TwitterAuthProvider();
const githubProvider   = new firebase.auth.GithubAuthProvider();

/*
 * Choose between multiple google accounts
 * http://stackoverflow.com/a/40551683/23572
 */
googleProvider.setCustomParameters({prompt: 'consent select_account'});
githubProvider.setCustomParameters({allow_signup: true});

function Header()
{
	const user                          = useContext(UserContext);

	const navigate = useNavigate();

	const handleEdit = () =>
	{
		navigate('/account');
	}

	const handleLogout = () =>
	{
		app.auth().signOut();
	};

	const getDisplayName = () =>
	{
		if (user && user.displayName)
		{
			return (
				<h2>
					<b>
						{user.displayName}
					</b>
				</h2>
			);
		}
		return false;
	};

	const authenticate = (provider) =>
	{
		app.auth().signInWithPopup(provider)
			.catch(error => console.error({error}));
	};

	const renderAuthentication = () =>
	{
		if (user)
		{
			return (
				<Dropdown className='text-light'>
					<Dropdown.Toggle variant='link'>
						Account Settings
					</Dropdown.Toggle>
					<Dropdown.Menu className='dropdown-menu-right'>
						<Dropdown.Item className='user-photo-container'>
							{getDisplayName()}
						</Dropdown.Item>
						<Dropdown.Item>
							<Button type='button' className='btn-block' variant='warning' size='lg' onClick={handleEdit}>
								<FontAwesomeIcon icon={faWrench} size='lg' fixedWidth />
								{' Edit'}
							</Button>
						</Dropdown.Item>
						<Dropdown.Item>
							<Button type='button' className='btn-block' variant='warning' size='lg' onClick={handleLogout}>
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
				<Button type='button' className='google' onClick={() => authenticate(googleProvider)}>
					<FontAwesomeIcon icon={faGoogle} size='lg' fixedWidth />
					{' Log in with Google'}
				</Button>
				<Button type='button' className='github' onClick={() => authenticate(githubProvider)}>
					<FontAwesomeIcon icon={faGithub} size='lg' fixedWidth />
					{' Log in with GitHub'}
				</Button>
			</NavDropdown>
		);
	};

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
					<Nav.Link href='https://factorioprints.com/create' to='https://factorioprints.com/create' className='text-light'>
						<FontAwesomeIcon icon={faPlusSquare} size='lg' fixedWidth />
						{' Create'}
					</Nav.Link>
					{user
						&& <Nav.Link as={Link} href='/favorites' to='/favorites' className='text-light'>
							<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
							{' My Favorites'}
						</Nav.Link>}
					{user
						&& <Nav.Link as={Link} href={`/user/${user.uid}`} to={`/user/${user.uid}`} className='text-light'>
							<FontAwesomeIcon icon={faUser} size='lg' fixedWidth />
							{' My Blueprints'}
						</Nav.Link>}
					<Nav.Link as={Link} href='/chat' to='/chat' className='text-light'>
						<FontAwesomeIcon icon={faDiscord} size='lg' fixedWidth />
						{' Chat'}
					</Nav.Link>
					<Nav.Link as={Link} href='/contributors' to='/contributors' className='text-light'>
						<FontAwesomeIcon icon={faPatreon} size='lg' fixedWidth />
						{' Contributors'}
					</Nav.Link>
					<Nav.Link as={Link} href='https://www.patreon.com/FactorioBlueprints' to='https://www.patreon.com/FactorioBlueprints' className='text-dark' target="_blank" rel="noopener noreferrer">
						<FontAwesomeIcon icon={faDonate} size='lg' fixedWidth />
						{' Donate'}
					</Nav.Link>
				</Nav>
				<Nav className='mr-sm-2' justify>
				{renderAuthentication()}
			</Nav>
			</Navbar.Collapse>
		</Navbar>
	);
}

Header.propTypes = forbidExtraProps({});

export default Header;
