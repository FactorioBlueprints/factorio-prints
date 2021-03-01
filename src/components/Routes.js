import React                          from 'react';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import Account                        from './Account';
import BlueprintGrid                  from './BlueprintGrid';
import Contact                        from './Contact';
import Header                         from './Header';
import Intro                          from './Intro';
import MostFavoritedGrid              from './MostFavoritedGrid';
import FavoritesGrid                  from './MyFavoritesGrid';
import NoMatch                        from './NoMatch';
import SingleBlueprint                from './SingleBlueprint';
import UserGrid                       from './UserGrid';

Routes.propTypes = {};

function renderIntro()
{
	return (
		<div>
			<Intro />
			<BlueprintGrid />
		</div>
	);
}

function renderTag(props)
{
	const {pathname} = props.location;
	const tagId      = pathname.replace(/^\/tagged/, '');

	return <BlueprintGrid initialTag={tagId} />;
}

function Routes(props)
{
	return (
		<BrowserRouter>
			<div>
				<Route path='/' component={Header} />
				<Switch>
					<Route path='/' exact render={renderIntro} />
					<Route path='/blueprints' exact component={BlueprintGrid} />
					<Route path='/top' exact component={MostFavoritedGrid} />
					{/* <Route path='/create' exact component={Create} /> */}
					<Route path='/favorites' exact component={FavoritesGrid} />
					<Route path='/contact' exact component={Contact} />
					<Route path='/account' exact component={Account} />
					<Route path='/view/:blueprintId' component={SingleBlueprint} />
					{/* <Route path='/edit/:blueprintId' component={EditBlueprint} /> */}
					<Route path='/user/:userId' component={UserGrid} />
					<Route path='/tagged/:tag' render={renderTag} />
					<Route component={NoMatch} />
				</Switch>
			</div>
		</BrowserRouter>
	);
}

export default Routes;
