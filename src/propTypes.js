import {forbidExtraProps} from 'airbnb-prop-types';
import PropTypes          from 'prop-types';

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
	fileName           : PropTypes.string,
	imageUrl           : PropTypes.string,
	lastUpdatedDate    : PropTypes.number.isRequired,
	numberOfFavorites  : PropTypes.number.isRequired,
	tags               : PropTypes.arrayOf(PropTypes.string.isRequired),
	authorId           : PropTypes.string,
	author             : PropTypes.shape(forbidExtraProps({
		displayName: PropTypes.string,
		userId     : PropTypes.string.isRequired,
	})).isRequired,
	image              : PropTypes.shape(forbidExtraProps({
		id        : PropTypes.string.isRequired,
		deletehash: PropTypes.string.isRequired,
		height    : PropTypes.number.isRequired,
		width     : PropTypes.number.isRequired,
		type      : PropTypes.string.isRequired,
	})).isRequired,
}));

export const blueprintSummarySchema = PropTypes.shape(forbidExtraProps({
	key              : PropTypes.string.isRequired,
	title            : PropTypes.string.isRequired,
	imgurId          : PropTypes.string.isRequired,
	imgurType        : PropTypes.string.isRequired,
	numberOfFavorites: PropTypes.number.isRequired,
	lastUpdatedDate  : PropTypes.number,
	height           : PropTypes.number,
	width            : PropTypes.number,
})).isRequired;

export const blueprintSummariesSchema = PropTypes.arrayOf(blueprintSummarySchema).isRequired;

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
}));

export const historySchema = PropTypes.shape({
	push: PropTypes.func.isRequired,
});
