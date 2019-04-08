import {combineReducers}            from 'redux';
import authReducer                  from './authReducer';
import blueprintAllFavoritesReducer from './blueprintAllFavoritesReducer';
import blueprintMyFavoritesReducer  from './blueprintMyFavoritesReducer';
import blueprintsReducer            from './blueprintsReducer';
import blueprintSummariesReducer    from './blueprintSummariesReducer';
import filteredTagsReducer          from './filteredTagsReducer';
import moderatorsReducer            from './moderatorsReducer';
import myReducer                    from './myReducer';
import tagsReducer                  from './tagsReducer';
import titleFilterReducer           from './titleFilterReducer';
import usersReducer                 from './usersReducer';

const rootReducer = combineReducers({
	blueprints           : blueprintsReducer,
	blueprintSummaries   : blueprintSummariesReducer,
	blueprintMyFavorites : blueprintMyFavoritesReducer,
	blueprintAllFavorites: blueprintAllFavoritesReducer,
	tags                 : tagsReducer,
	filteredTags         : filteredTagsReducer,
	auth                 : authReducer,
	users                : usersReducer,
	moderators           : moderatorsReducer,
	titleFilter          : titleFilterReducer,
	my                   : myReducer,
});

export default rootReducer;
