import React                          from 'react';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import Contact                        from './Contact';
import EfficientAccount               from './EfficientAccount';
import BlueprintGrid                  from './grid/BlueprintGrid';
import MostFavoritedGrid              from './grid/MostFavoritedGrid';
import MyFavoritesGrid                from './grid/MyFavoritesGrid';
import UserGrid                       from './grid/UserGrid';
import Header                         from './Header';
import Intro                          from './Intro';
import NoMatch                        from './NoMatch';
import ScrollToTop                    from './ScrollToTop';
import SingleBlueprint                from './single/EfficientSingleBlueprint';

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

function Routes(props)
{
	return (
		<BrowserRouter>
			<ScrollToTop />
			<div>
				<Route path='/' component={Header} />
				<Switch>
					<Route path='/' exact render={renderIntro} />
					<Route path='/blueprints' component={BlueprintGrid} />
					<Route path='/top' exact component={MostFavoritedGrid} />
					{/* <Route path='/create' exact component={Create} /> */}
					<Route path='/favorites' exact component={MyFavoritesGrid} />
					<Route path='/contact' exact component={Contact} />
					<Route path='/account' exact component={EfficientAccount} />
					<Route path='/view/:blueprintId' component={SingleBlueprint} />
					{/* <Route path='/edit/:blueprintId' component={EditBlueprint} /> */}
					<Route path='/user/:userId' component={UserGrid} />
					<Route component={NoMatch} />
				</Switch>
			</div>
		</BrowserRouter>
	);
}

export default Routes;
