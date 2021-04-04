import isEmpty   from 'lodash/isEmpty';
import mapValues from 'lodash/mapValues';
import pickBy    from 'lodash/pickBy';

import throttle from 'lodash/throttle';
import React    from 'react';
import ReactDOM from 'react-dom';

import {Provider} from 'react-redux';

import {applyMiddleware, compose, createStore} from 'redux';
import createSagaMiddleware                    from 'redux-saga';
import Root                                    from './components/Root';

import './css/style.css';

import {saveState} from './localStorage';

import rootReducer     from './reducers/rootReducer';
import reportWebVitals from './reportWebVitals';
import rootSaga        from './sagas/rootSaga';

// Create the saga middleware
const sagaMiddleware = createSagaMiddleware();

// Const preloadedState = loadState();

// Mount it on the Store
const store = createStore(
	rootReducer,
	// PreloadedState,
	compose(applyMiddleware(sagaMiddleware)),
);

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

const provider = (
	<Provider store={store}>
		<Root />
	</Provider>
);

ReactDOM.render(
	provider,
	document.getElementById('root'),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
