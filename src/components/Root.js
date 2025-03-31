import {forbidExtraProps}     from 'airbnb-prop-types';
import PropTypes              from 'prop-types';
import React, {useEffect, useRef} from 'react';
import {Helmet}               from 'react-helmet';
import {connect}              from 'react-redux';
import {BrowserRouter, Route, Routes, useParams, useLocation} from 'react-router-dom';
import {bindActionCreators}   from 'redux';
import {useAuthState}         from 'react-firebase-hooks/auth';

import {authStateChanged}     from '../actions/actionCreators';
import {auth, database}       from '../base';
import {onAuthStateChanged}   from 'firebase/auth';
import {ref, runTransaction}  from 'firebase/database';
import Account                from './Account';

import BlueprintGrid      from './BlueprintGrid';
import Chat               from './Chat';
import Create             from './Create';
import EditBlueprint      from './EditBlueprint';
import Header             from './Header';
import Intro              from './Intro';
import KnownIssues        from './KnownIssues';
import MostFavoritedGrid  from './MostFavoritedGrid';
import FavoritesGrid      from './MyFavoritesGrid';
import NoMatch            from './NoMatch';
import SingleBlueprint    from './SingleBlueprint';
import UserGrid           from './UserGrid';

const TaggedRoute = () =>
{
	const location = useLocation();
	const tagPath = '/' + decodeURIComponent(location.pathname.replace(/^\/tagged\//, ''));

	return <BlueprintGrid initialTag={tagPath} />;
};

const Root = ({authStateChanged}) =>
{
	const authUnsubscribeRef = useRef(null);

	useEffect(() =>
	{
		const unsubscribe = onAuthStateChanged(
			auth,
			(user) =>
			{
				if (user)
				{
					const {uid, email, photoURL, emailVerified, providerData} = user;

					const providerId          = providerData && providerData.length && providerData[0].providerId;
					const providerDisplayName = providerId ? providerData[0].displayName : undefined;

					const buildUserInformation = (existingUser) =>
					{
						const existingUserInitialized = existingUser || {};
						const displayName             = existingUserInitialized.displayName || providerDisplayName;
						return {
							...existingUserInitialized,
							displayName,
							providerDisplayName,
							photoURL,
							email,
							emailVerified,
							providerId,
						};
					};

					const userRef = ref(database, `/users/${uid}/`);
					runTransaction(userRef, buildUserInformation);
				}
				authStateChanged(user);
			},
			error => console.log('Root authentication error:', error),
		);

		authUnsubscribeRef.current = unsubscribe;

		return () =>
		{
			if (authUnsubscribeRef.current)
			{
				authUnsubscribeRef.current();
			}
		};
	}, [authStateChanged]);

	const renderIntro = () => (
		<div>
			<KnownIssues />
			<Intro />
			<BlueprintGrid />
		</div>
	);

	return (
		<>
			<Helmet>
				<title>
					Factorio Prints
				</title>
			</Helmet>
			<BrowserRouter>
				<div>
					<Header />
					<Routes>
						<Route path='/' element={renderIntro()} />
						<Route path='/blueprints' element={<BlueprintGrid />} />
						<Route path='/top' element={<MostFavoritedGrid />} />
						<Route path='/create' element={<Create />} />
						<Route path='/favorites' element={<FavoritesGrid />} />
						<Route path='/knownIssues' element={<KnownIssues />} />
						<Route path='/chat' element={<Chat />} />
						<Route path='/account' element={<Account />} />
						<Route path='/view/:blueprintId' element={<SingleBlueprint />} />
						<Route path='/edit/:blueprintId' element={<EditBlueprint />} />
						<Route path='/user/:userId' element={<UserGrid />} />
						<Route path='/tagged/*' element={<TaggedRoute />} />
						<Route path='*' element={<NoMatch />} />
					</Routes>
				</div>
			</BrowserRouter>
		</>
	);
};

Root.propTypes = forbidExtraProps({
	authStateChanged: PropTypes.func.isRequired,
});

const mapStateToProps = () => ({});

const mapDispatchToProps = dispatch => bindActionCreators({authStateChanged}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(Root);
