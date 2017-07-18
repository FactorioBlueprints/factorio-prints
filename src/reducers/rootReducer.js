import {combineReducers} from 'redux';
import authReducer from './authReducer';

import blueprintsReducer from './blueprintsReducer';
import blueprintSummariesReducer from './blueprintSummariesReducer';
import byTagReducer from './byTagReducer';
import filteredTagsReducer from './filteredTagsReducer';
import tagsReducer from './tagsReducer';
import usersReducer from './usersReducer';
import moderatorsReducer from './moderatorsReducer';
import titleFilterReducer from './titleFilterReducer';

const rootReducer = combineReducers({
	blueprints        : blueprintsReducer,
	blueprintSummaries: blueprintSummariesReducer,
	tags              : tagsReducer,
	filteredTags      : filteredTagsReducer,
	byTag             : byTagReducer,
	auth              : authReducer,
	users             : usersReducer,
	moderators        : moderatorsReducer,
	titleFilter       : titleFilterReducer,
});

export default rootReducer;
