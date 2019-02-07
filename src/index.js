import isEmpty from 'lodash/isEmpty';
import mapValues from 'lodash/mapValues';
import pickBy from 'lodash/pickBy';

import throttle from 'lodash/throttle';
import React from 'react';
import ReactDOM from 'react-dom';

import {Provider} from 'react-redux';

import {applyMiddleware, compose, createStore} from 'redux';
import createSagaMiddleware from 'redux-saga';
import Root from './components/Root';

import './css/style.css';
import './css/theme.css';

import {saveState} from './localStorage';

import rootReducer from './reducers/rootReducer';
import registerServiceWorker from './registerServiceWorker';
import rootSaga from './sagas/rootSaga';

// Create the saga middleware
const sagaMiddleware = createSagaMiddleware();

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// const preloadedState = loadState();

// Mount it on the Store
const store = createStore(
	rootReducer,
	// preloadedState,
	composeEnhancers(applyMiddleware(sagaMiddleware)));

store.subscribe(throttle(() =>
{
	const state = store.getState();

	const {
		blueprints,
		blueprintSummaries: {
			data: blueprintSummariesData,
		},
		tags              : {
			data: tagsData,
			tagHierarchy,
		},
		byTag,
		filteredTags,
		auth              : {
			myFavorites: {
				data: myFavoritesData,
			},
		},
		users,
	} = state;

	saveState({
		blueprints        : mapValues(pickBy(blueprints, ({data}) => !isEmpty(data)), ({data}) => ({data})),
		blueprintSummaries: {
			data: blueprintSummariesData,
		},
		tags: {
			data: tagsData,
			tagHierarchy,
		},
		byTag: mapValues(byTag, ({data}) => ({data})),
		filteredTags,
		auth : {
			myFavorites: {
				data: myFavoritesData,
			},
		},
		users: mapValues(pickBy(users, ({data}) => !isEmpty(data)), ({displayName: {data: displayNameData}, blueprints: {data: blueprintsData}}) =>
			({
				displayName: {
					data: displayNameData,
				},
				blueprints: {
					data: blueprintsData,
				},
			})),
	});
}, 1000));

sagaMiddleware.run(rootSaga);

ReactDOM.render(<Provider store={store}><Root /></Provider>, document.getElementById('root'));
registerServiceWorker();
