import React                          from 'react';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import Account                        from './Account';
import Contact                        from './Contact';
import EfficientBlueprintGrid         from './grid/EfficientBlueprintGrid';
import EfficientMostFavoritedGrid     from './grid/EfficientMostFavoritedGrid';
import EfficientMyFavoritesGrid       from './grid/EfficientMyFavoritesGrid';
import EfficientUserGrid              from './grid/EfficientUserGrid';
import Header                         from './Header';
import Intro                          from './Intro';
import NoMatch                        from './NoMatch';
import SingleBlueprint                from './SingleBlueprint';

Routes.propTypes = {};

function renderIntro()
{
	return (
		<div>
			<Intro />
			<EfficientBlueprintGrid />
		</div>
	);
}

function renderTag(props)
{
	const {pathname} = props.location;
	const tagId      = pathname.replace(/^\/tagged/, '');

	return <EfficientBlueprintGrid initialTag={tagId} />;
}

function Routes(props)
{
	return (
		<BrowserRouter>
			<div>
				<Route path='/' component={Header} />
				<Switch>
					<Route path='/' exact render={renderIntro} />
					<Route path='/blueprints' exact component={EfficientBlueprintGrid} />
					<Route path='/top' exact component={EfficientMostFavoritedGrid} />
					{/* <Route path='/create' exact component={Create} /> */}
					<Route path='/favorites' exact component={EfficientMyFavoritesGrid} />
					<Route path='/contact' exact component={Contact} />
					<Route path='/account' exact component={Account} />
					<Route path='/view/:blueprintId' component={SingleBlueprint} />
					{/* <Route path='/edit/:blueprintId' component={EditBlueprint} /> */}
					<Route path='/user/:userId' component={EfficientUserGrid} />
					<Route path='/tagged/:tag' render={renderTag} />
					<Route component={NoMatch} />
				</Switch>
			</div>
		</BrowserRouter>
	);
}

export default Routes;
