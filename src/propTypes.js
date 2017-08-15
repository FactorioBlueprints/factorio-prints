import PropTypes from 'prop-types';
import {forbidExtraProps} from 'airbnb-prop-types';

export const userSchema = PropTypes.shape(forbidExtraProps({
	uid        : PropTypes.string.isRequired,
	displayName: PropTypes.string,
	photoURL   : PropTypes.string,
}));

export const blueprintSchema = PropTypes.shape(forbidExtraProps({
	title              : PropTypes.string.isRequired,
	blueprintString    : PropTypes.string.isRequired,
	createdDate        : PropTypes.number.isRequired,
	descriptionMarkdown: PropTypes.string.isRequired,
	favorites          : PropTypes.objectOf(PropTypes.bool.isRequired),
	fileName           : PropTypes.string.isRequired,
	imageUrl           : PropTypes.string.isRequired,
	lastUpdatedDate    : PropTypes.number.isRequired,
	numberOfFavorites  : PropTypes.number.isRequired,
	tags               : PropTypes.arrayOf(PropTypes.string.isRequired),
	author             : PropTypes.shape(forbidExtraProps({
		displayName: PropTypes.string.isRequired,
		userId     : PropTypes.string.isRequired,
	})).isRequired,
	image: PropTypes.shape(forbidExtraProps({
		id        : PropTypes.string.isRequired,
		deletehash: PropTypes.string.isRequired,
		height    : PropTypes.number.isRequired,
		width     : PropTypes.number.isRequired,
		type      : PropTypes.string.isRequired,
	})).isRequired,
}));

export const blueprintSummariesSchema = PropTypes.objectOf(PropTypes.shape(forbidExtraProps({
	title            : PropTypes.string.isRequired,
	imgurId          : PropTypes.string.isRequired,
	imgurType        : PropTypes.string.isRequired,
	numberOfFavorites: PropTypes.number.isRequired,
})).isRequired).isRequired;

export const byTagSchema = PropTypes.objectOf(PropTypes.shape(forbidExtraProps({
	loading: PropTypes.bool.isRequired,
	data   : PropTypes.objectOf(PropTypes.bool.isRequired).isRequired,
})).isRequired).isRequired;

export const locationSchema = PropTypes.shape(forbidExtraProps({
	pathname: PropTypes.string.isRequired,
	search  : PropTypes.string.isRequired,
	hash    : PropTypes.string.isRequired,
	state   : PropTypes.string,
	key     : PropTypes.string,
})).isRequired;

export const historySchema = PropTypes.shape({
	push: PropTypes.func.isRequired,
});
