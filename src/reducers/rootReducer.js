import {combineReducers}            from 'redux';
import authReducer                  from './authReducer';
import blueprintAllFavoritesReducer from './blueprintAllFavoritesReducer';
import blueprintsReducer            from './blueprintsReducer';
import blueprintSummariesReducer    from './blueprintSummariesReducer';
import filteredTagsReducer          from './filteredTagsReducer';
import moderatorsReducer            from './moderatorsReducer';
import tagsReducer                  from './tagsReducer';
import titleFilterReducer           from './titleFilterReducer';
import usersReducer                 from './usersReducer';

const rootReducer = combineReducers({
	blueprints           : blueprintsReducer,
	blueprintSummaries   : blueprintSummariesReducer,
	blueprintAllFavorites: blueprintAllFavoritesReducer,
	tags                 : tagsReducer,
	filteredTags         : filteredTagsReducer,
	auth                 : authReducer,
	users                : usersReducer,
	moderators           : moderatorsReducer,
	titleFilter          : titleFilterReducer,
});

export default rootReducer;
