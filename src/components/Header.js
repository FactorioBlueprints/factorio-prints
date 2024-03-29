import {faDiscord, faGithub, faGoogle, faPatreon} from '@fortawesome/free-brands-svg-icons';

import {
	faClock,
	faCogs,
	faDonate,
	faHeart,
	faPlusSquare,
	faSearch,
	faSignInAlt,
	faSignOutAlt,
	faTrophy,
	faUser,
	faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}  from '@fortawesome/react-fontawesome';
import {forbidExtraProps} from 'airbnb-prop-types';

import {GithubAuthProvider, GoogleAuthProvider} from 'firebase/auth';

import React, {useContext} from 'react';

import Button      from 'react-bootstrap/Button';
import Dropdown    from 'react-bootstrap/Dropdown';
import Nav         from 'react-bootstrap/Nav';
import Navbar      from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

import {Link} from 'react-router-dom';

import UserContext from '../context/userContext';

const googleProvider = new GoogleAuthProvider();
// const facebookProvider = new firebase.auth.FacebookAuthProvider();
// const twitterProvider  = new firebase.auth.TwitterAuthProvider();
const githubProvider = new GithubAuthProvider();

/*
 * Choose between multiple google accounts
 * http://stackoverflow.com/a/40551683/23572
 */
googleProvider.setCustomParameters({prompt: 'consent select_account'});
githubProvider.setCustomParameters({prompt: 'consent select_account'});

function Header()
{
	const {user, authenticate, handleLogout} = useContext(UserContext);

	const getDisplayName = () =>
	{
		if (user?.displayName)
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

	const renderAuthentication = () =>
	{
		if (user)
		{
			return (
				<Dropdown className='text-light'>
					<Dropdown.Toggle variant='link'>
						My Account
					</Dropdown.Toggle>
					<Dropdown.Menu align="end">
						<Dropdown.Item className='user-photo-container'>
							{getDisplayName()}
						</Dropdown.Item>
						<Nav.Link as={Link} href='/favorites' to='/favorites' className='text-light'>
							<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth style={{'color': 'var(--bs-orange)'}} />
							{' My Favorites'}
						</Nav.Link>
						<Nav.Link as={Link} href={`/user/${user.uid}`} to={`/user/${user.uid}`} className='text-light'>
							<FontAwesomeIcon icon={faUser} size='lg' fixedWidth style={{'color': 'var(--bs-orange)'}} />
							{' My Blueprints'}
						</Nav.Link>
						<Nav.Link as={Link} href='/account' to='/account' className='text-light'>
							<FontAwesomeIcon icon={faWrench} size='lg' fixedWidth style={{'color': 'var(--bs-orange)'}} />
							{' My Display Name'}
						</Nav.Link>
						<Nav.Link as={Link} className='text-light' onClick={handleLogout}>
							<FontAwesomeIcon icon={faSignOutAlt} size='lg' fixedWidth style={{'color': 'var(--bs-orange)'}} />
							{' Log out'}
						</Nav.Link>
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
			<NavDropdown title={title} style={{minWidth: '210px'}} align="end">
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
		<Navbar expand='lg' sticky='top' collapseOnSelect bg='warning' fixed='top'>
			<Navbar.Brand>
				<Link to='/'>
					<FontAwesomeIcon icon={faCogs} size='lg' fixedWidth />
					{' Factorio Prints'}
				</Link>
			</Navbar.Brand>
			<Navbar.Toggle />

			<Navbar.Collapse>
				<Nav>
					{/* From https://github.com/ReactTraining/react-router/issues/4463#issuecomment-342838735 */}
					<Nav.Link as={Link} href='/search' to='/search' className='text-light'>
						<FontAwesomeIcon icon={faSearch} size='lg' fixedWidth />
						{' Search'}
					</Nav.Link>
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
			</Navbar.Collapse>
			<Nav className="justify-content-end">
				{renderAuthentication()}
			</Nav>
		</Navbar>
	);
}

Header.propTypes = forbidExtraProps({});

export default Header;
