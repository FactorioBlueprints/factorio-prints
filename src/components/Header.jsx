import {faDiscord, faGithub, faGoogle, faPatreon} from '@fortawesome/free-brands-svg-icons';

import {
	faBug,
	faClock,
	faCogs,
	faDonate,
	faHeart,
	faPlusSquare,
	faSearch,
	faShieldAlt,
	faSignInAlt,
	faSignOutAlt,
	faTrophy,
	faUser,
	faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon}                                                           from '@fortawesome/react-fontawesome';
import {getAuth, GithubAuthProvider, GoogleAuthProvider, signInWithPopup, signOut} from 'firebase/auth';
import PropTypes                                                                   from 'prop-types';
import React, {useMemo, useState}                                                   from 'react';
import Button                                                                      from 'react-bootstrap/Button';
import Dropdown                                                                    from 'react-bootstrap/Dropdown';
import Nav                                                                         from 'react-bootstrap/Nav';
import Navbar                                                                      from 'react-bootstrap/Navbar';
import NavDropdown                                                                 from 'react-bootstrap/NavDropdown';
import {useAuthState}                                                              from 'react-firebase-hooks/auth';
import { Link } from '@tanstack/react-router';

import {app}                           from '../base';
import {useIsModerator}                from '../hooks/useModerators';
import {historySchema, locationSchema} from '../propTypes';

const Header = () =>
{
	const [user] = useAuthState(getAuth(app));
	const moderatorQuery = useIsModerator(user?.uid);
	const isModerator = moderatorQuery.data ?? false;
	const [showAccountDropdown, setShowAccountDropdown] = useState(false);

	const googleProvider = useMemo(() =>
	{
		const provider = new GoogleAuthProvider();
		// Choose between multiple google accounts
		// http://stackoverflow.com/a/40551683/23572
		provider.setCustomParameters({prompt: 'consent select_account'});
		return provider;
	}, []);

	const githubProvider = useMemo(() =>
	{
		const provider = new GithubAuthProvider();
		provider.setCustomParameters({allow_signup: true});
		return provider;
	}, []);

	const handleLogout = () =>
	{
		signOut(getAuth(app));
	};

	const getDisplayName = () =>
	{
		if (user && user.displayName)
		{
			return (
				<div className='h4'>
					<b>
						{user.displayName}
					</b>
				</div>
			);
		}
		return false;
	};

	const authenticate = (provider) =>
	{
		signInWithPopup(getAuth(app), provider).catch(error =>
		{
			// Don't show error for user-cancelled popups
			if (error.code !== 'auth/popup-closed-by-user')
			{
				console.error({error});
			}
		});
	};

	const renderAuthentication = () =>
	{
		if (user)
		{
			const closeDropdown = () => setShowAccountDropdown(false);

			return (
				<Dropdown
					className='text-light'
					show={showAccountDropdown}
					onToggle={(isOpen) => setShowAccountDropdown(isOpen)}
				>
					<Dropdown.Toggle variant='link'>
						Account Settings
					</Dropdown.Toggle>
					<Dropdown.Menu className='dropdown-menu-right text-left'>
						<Dropdown.Item as='div' className='user-photo-container'>
							{getDisplayName()}
						</Dropdown.Item>
						<Dropdown.Item as={Link} to='/favorites' onClick={closeDropdown} className='text-light text-left'>
							<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
							{' My Favorites'}
						</Dropdown.Item>
						<Dropdown.Item as={Link} to='/user/$userId' params={{ userId: user.uid }} onClick={closeDropdown} className='text-light text-left'>
							<FontAwesomeIcon icon={faUser} size='lg' fixedWidth />
							{' My Blueprints'}
						</Dropdown.Item>
						<Dropdown.Item as={Link} to='/account' onClick={closeDropdown} className='text-light text-left'>
							<FontAwesomeIcon icon={faWrench} size='lg' fixedWidth style={{color: 'var(--bs-orange)'}} />
							{' My Display Name'}
						</Dropdown.Item>
						{isModerator && (
							<Dropdown.Item as={Link} to='/users' onClick={closeDropdown} className='text-light text-left'>
								<FontAwesomeIcon icon={faShieldAlt} size='lg' fixedWidth style={{color: 'var(--bs-purple)'}} />
								{' Admin: Users'}
							</Dropdown.Item>
						)}
						<Dropdown.Item>
							<Button
								type='link'
								className='w-100'
								variant='warning'
								size='lg'
								onClick={() =>
								{
									handleLogout();
									closeDropdown();
								}}
							>
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
				<Button type='button' className='google w-100' onClick={() => authenticate(googleProvider)}>
					<FontAwesomeIcon icon={faGoogle} size='lg' fixedWidth />
					{' Log in with Google'}
				</Button>
				<Button type='button' className='github w-100' onClick={() => authenticate(githubProvider)}>
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
					<Nav.Link href='https://www.factorio.school/search' className='text-light'>
						<FontAwesomeIcon icon={faSearch} size='lg' fixedWidth />
						{' Search'}
					</Nav.Link>
					<Nav.Item>
						<Link to='/blueprints' className='nav-link text-light'>
							<FontAwesomeIcon icon={faClock} size='lg' fixedWidth />
							{' Most Recent'}
						</Link>
					</Nav.Item>
					<Nav.Item>
						<Link to='/top' className='nav-link text-light'>
							<FontAwesomeIcon icon={faTrophy} size='lg' fixedWidth />
							{' Most Favorited'}
						</Link>
					</Nav.Item>
					<Nav.Item>
						<Link to='/create' className='nav-link text-light'>
							<FontAwesomeIcon icon={faPlusSquare} size='lg' fixedWidth />
							{' Create'}
						</Link>
					</Nav.Item>
					<Nav.Item>
						<Link to='/knownIssues' className='nav-link text-light'>
							<FontAwesomeIcon icon={faBug} size='lg' fixedWidth />
							{' Known Issues'}
						</Link>
					</Nav.Item>
					<Nav.Item>
						<Link to='/chat' className='nav-link text-light'>
							<FontAwesomeIcon icon={faDiscord} size='lg' fixedWidth />
							{' Chat'}
						</Link>
					</Nav.Item>
					<Nav.Link href='https://www.factorio.school/contributors' className='text-light'>
						<FontAwesomeIcon icon={faPatreon} size='lg' fixedWidth />
						{' Contributors'}
					</Nav.Link>
					<Nav.Link href='https://www.patreon.com/FactorioBlueprints' className='text-dark' target='_blank' rel='noopener noreferrer'>
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
};

Header.propTypes = {
	location     : locationSchema,
	history      : historySchema,
	staticContext: PropTypes.shape({}),
};

export default Header;
