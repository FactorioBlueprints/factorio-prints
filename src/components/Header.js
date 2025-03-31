import {faDiscord, faGithub, faGoogle, faPatreon} from '@fortawesome/free-brands-svg-icons';

import {
	faBug,
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
import {getAuth, signInWithPopup, signOut,
	GoogleAuthProvider, FacebookAuthProvider,
	TwitterAuthProvider, GithubAuthProvider} from 'firebase/auth';
import PropTypes          from 'prop-types';
import React, {useMemo}   from 'react';
import Button             from 'react-bootstrap/Button';
import Dropdown           from 'react-bootstrap/Dropdown';
import Nav                from 'react-bootstrap/Nav';
import Navbar             from 'react-bootstrap/Navbar';
import NavDropdown        from 'react-bootstrap/NavDropdown';
import {connect}          from 'react-redux';
import {Link}             from 'react-router-dom';
import {bindActionCreators} from 'redux';

import {historySchema, locationSchema} from '../propTypes';
import * as selectors                  from '../selectors';

const Header = ({
	user,
	match,
	location,
	history,
	staticContext,
}) =>
{
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

	const facebookProvider = useMemo(() => new FacebookAuthProvider(), []);
	const twitterProvider = useMemo(() => new TwitterAuthProvider(), []);

	const handleEdit = () =>
	{
		window.location.href = '/account';
	};

	const handleLogout = () =>
	{
		const auth = getAuth();
		signOut(auth);
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
		const auth = getAuth();
		signInWithPopup(auth, provider).catch(error => console.error({error}));
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
						<Nav.Link as={Link} to='/favorites' className='text-light'>
							<FontAwesomeIcon icon={faHeart} size='lg' fixedWidth />
							{' My Favorites'}
						</Nav.Link>
						<Nav.Link as={Link} to={`/user/${user.uid}`} className='text-light'>
							<FontAwesomeIcon icon={faUser} size='lg' fixedWidth />
							{' My Blueprints'}
						</Nav.Link>
						<Nav.Link as={Link} to='/account' className='text-light'>
							<FontAwesomeIcon icon={faWrench} size='lg' fixedWidth style={{color: 'var(--bs-orange)'}} />
							{' My Display Name'}
						</Nav.Link>
						<Dropdown.Item>
							<Button type='link' className='w-100' variant='warning' size='lg' onClick={handleLogout}>
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
					<Nav.Link as={Link} to='/blueprints' className='text-light'>
						<FontAwesomeIcon icon={faClock} size='lg' fixedWidth />
						{' Most Recent'}
					</Nav.Link>
					<Nav.Link as={Link} to='/top' className='text-light'>
						<FontAwesomeIcon icon={faTrophy} size='lg' fixedWidth />
						{' Most Favorited'}
					</Nav.Link>
					<Nav.Link as={Link} to='/create' className='text-light'>
						<FontAwesomeIcon icon={faPlusSquare} size='lg' fixedWidth />
						{' Create'}
					</Nav.Link>
					<Nav.Link as={Link} to='/knownIssues' className='text-light'>
						<FontAwesomeIcon icon={faBug} size='lg' fixedWidth />
						{' Known Issues'}
					</Nav.Link>
					<Nav.Link as={Link} to='/chat' className='text-light'>
						<FontAwesomeIcon icon={faDiscord} size='lg' fixedWidth />
						{' Chat'}
					</Nav.Link>
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

Header.propTypes = forbidExtraProps({
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
	})),
	location     : locationSchema,
	history      : historySchema,
	staticContext: PropTypes.shape(forbidExtraProps({})),
});

const mapStateToProps = storeState => ({
	user: selectors.getUser(storeState),
});

const mapDispatchToProps = (dispatch) =>
{
	const actionCreators = {};
	return bindActionCreators(actionCreators, dispatch);
};

export default connect(mapStateToProps, mapDispatchToProps)(Header);
